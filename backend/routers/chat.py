import time
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from backend.models.database import get_db
from backend.models.schemas import ChatRequest, ChatResponse, RateLimitInfo
from backend.services.openrouter import openrouter_client
from backend.services.cache import cache_service
from backend.services.rate_limiter import rate_limiter
from backend.utils.config import settings
from backend.utils.identity import detect_identity_query

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)

def get_client_identifier(request: Request, session_id: str) -> str:
    """Returns a unique rate limit identifier based on IP and session_id."""
    ip = request.client.host if request.client else "unknown"
    return f"{ip}:{session_id}"

@router.post("", response_model=ChatResponse)
async def chat(chat_request: ChatRequest, request: Request):
    session_id = chat_request.session_id
    message_content = chat_request.message
    model_used = chat_request.model or "meta-llama/llama-3-8b-instruct:free"

    # Verify if session exists
    conn = get_db()
    cursor_session = conn.execute("SELECT id FROM sessions WHERE id = ?;", (session_id,))
    if not cursor_session.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    conn.close()

    # Check if the query is an identity query (who made you, source code, pre-brain, etc.)
    identity_reply = detect_identity_query(message_content)
    if identity_reply:
        # Save user message and identity reply to db messages history
        conn = get_db()
        try:
            # User message
            user_msg_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO messages (id, session_id, role, content, model_used) VALUES (?, ?, ?, ?, ?);",
                (user_msg_id, session_id, "user", message_content, "zydrakon-orchestration")
            )
            # Assistant response
            asst_msg_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO messages (id, session_id, role, content, model_used) VALUES (?, ?, ?, ?, ?);",
                (asst_msg_id, session_id, "assistant", identity_reply, "zydrakon-orchestration")
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Error saving identity interaction: {str(e)}")
        finally:
            conn.close()

        # Cache this response to speed up future identical lookups
        cache_service.cache_response(message_content, identity_reply, "zydrakon-orchestration")
        cache_service.cache_response(message_content, identity_reply, model_used)

        return ChatResponse(
            response=identity_reply,
            model_used="zydrakon-orchestration",
            cached=False,
            latency_ms=1
        )

    rate_limit_key = get_client_identifier(request, session_id)

    # 1. Enforce Rate Limiting
    is_limited, limit_type, details = rate_limiter.check_rate_limit(rate_limit_key)
    if is_limited:
        if limit_type == "RPM_LIMITED":
            retry_seconds = details.get("retry_after_sec", 60)
            retry_time = (datetime.utcnow() + timedelta(seconds=retry_seconds)).isoformat() + "Z"
            error_content = {
                "status": "error",
                "code": "RATE_LIMITED",
                "message": f"You are sending requests too quickly. Please wait {retry_seconds} seconds.",
                "details": {"retry_after": retry_time, "limit_type": "RPM"}
            }
        else:
            retry_hours = details.get("retry_after_hours", 24)
            retry_time = (datetime.utcnow() + timedelta(hours=retry_hours)).isoformat() + "Z"
            error_content = {
                "status": "error",
                "code": "RATE_LIMITED",
                "message": f"You have reached the daily limit of {settings.RATE_LIMIT_DAILY} requests.",
                "details": {"retry_after": retry_time, "limit_type": "DAILY"}
            }
        return JSONResponse(status_code=429, content=error_content)

    # 2. Check Cache
    cached_reply = cache_service.get_cached_response(message_content, model_used)
    if cached_reply:
        # Save user message and cached assistant reply to db messages history
        conn = get_db()
        try:
            # User message
            user_msg_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO messages (id, session_id, role, content, model_used) VALUES (?, ?, ?, ?, ?);",
                (user_msg_id, session_id, "user", message_content, model_used)
            )
            # Assistant response
            asst_msg_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO messages (id, session_id, role, content, model_used) VALUES (?, ?, ?, ?, ?);",
                (asst_msg_id, session_id, "assistant", cached_reply, model_used)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Error saving cached message interaction: {str(e)}")
        finally:
            conn.close()

        # We do not count cached queries against the rate limit! 
        # This rewards users for cached hits and saves OpenRouter API quota.
        return ChatResponse(
            response=cached_reply,
            model_used=model_used,
            cached=True,
            latency_ms=0
        )

    # 3. Call OpenRouter (Uncached path)
    # Gather previous messages for context (last 6 messages)
    history_payload = []
    conn = get_db()
    try:
        cursor = conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT 6;",
            (session_id,)
        )
        rows = cursor.fetchall()
        # Since they are ordered by timestamp DESC, reverse them to be in chronological order
        for row in reversed(rows):
            history_payload.append({"role": row["role"], "content": row["content"]})
    except Exception as e:
        logger.error(f"Failed to fetch history context: {str(e)}")
    finally:
        conn.close()

    # Append current user query
    history_payload.append({"role": "user", "content": message_content})

    thinking_mode = chat_request.thinking or False

    start_time = time.time()
    try:
        reply_content, actual_model = openrouter_client.call_openrouter(
            message=message_content,
            requested_model=model_used,
            history=history_payload,
            thinking=thinking_mode
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenRouter service exception: {str(e)}")
    
    latency_ms = int((time.time() - start_time) * 1000)

    # 4. Save interactions and cache results
    conn = get_db()
    try:
        # Save user message
        user_msg_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, model_used) VALUES (?, ?, ?, ?, ?);",
            (user_msg_id, session_id, "user", message_content, actual_model)
        )
        # Save assistant message
        asst_msg_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, model_used) VALUES (?, ?, ?, ?, ?);",
            (asst_msg_id, session_id, "assistant", reply_content, actual_model)
        )
        conn.commit()
    except Exception as e:
        logger.error(f"Error saving live message interaction: {str(e)}")
    finally:
        conn.close()

    # Cache this response for the requested model and the actual model (to maximize cache hits)
    cache_service.cache_response(message_content, reply_content, actual_model)
    if actual_model != model_used:
        cache_service.cache_response(message_content, reply_content, model_used)

    # Record the request for rate limiting (since it wasn't cached)
    rate_limiter.record_request(rate_limit_key)

    return ChatResponse(
        response=reply_content,
        model_used=actual_model,
        cached=False,
        latency_ms=latency_ms
    )

@router.get("/limits", response_model=RateLimitInfo)
async def get_limits(session_id: str, request: Request):
    rate_limit_key = get_client_identifier(request, session_id)
    limits = rate_limiter.get_remaining_limits(rate_limit_key)
    return RateLimitInfo(
        rpm_limit=limits["rpm_limit"],
        rpm_remaining=limits["rpm_remaining"],
        daily_limit=limits["daily_limit"],
        daily_remaining=limits["daily_remaining"]
    )
