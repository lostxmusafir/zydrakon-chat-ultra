import time
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from backend.models.database import get_db
from backend.models.schemas import ChatRequest, ChatResponse, RateLimitInfo
from backend.services.openrouter import openrouter_client
from backend.services.cache import cache_service
from backend.services.rate_limiter import rate_limiter
from backend.utils.config import settings
from backend.utils.identity import detect_identity_query
from backend.utils.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)

def get_client_identifier(request: Request, session_id: str, user_id: str) -> str:
    """Returns a unique rate limit identifier based on IP, user_id and session_id."""
    ip = request.client.host if request.client else "unknown"
    return f"{ip}:{user_id}:{session_id}"

@router.post("", response_model=ChatResponse)
async def chat(chat_request: ChatRequest, request: Request, user: dict = Depends(get_current_user)):
    session_id = chat_request.session_id
    message_content = chat_request.message
    model_used = chat_request.model or "meta-llama/llama-3-8b-instruct:free"
    
    # Enforce Gold (zhipu-free) or Premium (zydrakon-premium) if thinking/Deep Research mode is enabled
    if chat_request.thinking and model_used == "zydrakon-free":
        model_used = "zhipu-free"

    # Enforce User Allowed Models (Gold free tier model restrictions)
    allowed_models = user.get("allowed_models")
    if allowed_models and isinstance(allowed_models, list):
        if model_used not in allowed_models and model_used != "zydrakon-orchestration":
            if "zhipu-free" in allowed_models:
                model_used = "zhipu-free"
            else:
                model_used = "zydrakon-free"

    # Verify if session exists and belongs to user
    db = get_db()
    if not db.sessions.find_one({"id": session_id, "user_id": user["id"]}):
        raise HTTPException(status_code=404, detail="Session not found or unauthorized")

    # Check if the query is an identity query (who made you, source code, pre-brain, etc.)
    identity_reply = detect_identity_query(message_content)
    if identity_reply:
        # Save user message and identity reply to db messages history
        try:
            now = datetime.utcnow()
            user_msg_id = str(uuid.uuid4())
            db.messages.insert_one({
                "id": user_msg_id, "session_id": session_id, "role": "user", 
                "content": message_content, "timestamp": now, "model_used": "zydrakon-orchestration"
            })
            
            asst_msg_id = str(uuid.uuid4())
            db.messages.insert_one({
                "id": asst_msg_id, "session_id": session_id, "role": "assistant", 
                "content": identity_reply, "timestamp": now, "model_used": "zydrakon-orchestration"
            })
        except Exception as e:
            logger.error(f"Error saving identity interaction: {str(e)}")

        # Cache this response to speed up future identical lookups
        cache_service.cache_response(message_content, identity_reply, "zydrakon-orchestration")
        cache_service.cache_response(message_content, identity_reply, model_used)

        return ChatResponse(
            response=identity_reply,
            model_used="zydrakon-orchestration",
            cached=False,
            latency_ms=1
        )

    rate_limit_key = get_client_identifier(request, session_id, user["id"])

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
        try:
            now = datetime.utcnow()
            user_msg_id = str(uuid.uuid4())
            db.messages.insert_one({
                "id": user_msg_id, "session_id": session_id, "role": "user", 
                "content": message_content, "timestamp": now, "model_used": model_used
            })
            
            asst_msg_id = str(uuid.uuid4())
            db.messages.insert_one({
                "id": asst_msg_id, "session_id": session_id, "role": "assistant", 
                "content": cached_reply, "timestamp": now, "model_used": model_used
            })
        except Exception as e:
            logger.error(f"Error saving cached message interaction: {str(e)}")

        # We do not count cached queries against the rate limit! 
        return ChatResponse(
            response=cached_reply,
            model_used=model_used,
            cached=True,
            latency_ms=0
        )

    # 3. Call OpenRouter (Uncached path)
    # Gather previous messages for context (last 6 messages)
    history_payload = []
    try:
        cursor = db.messages.find({"session_id": session_id}).sort("timestamp", -1).limit(6)
        rows = list(cursor)
        # Since they are ordered by timestamp DESC, reverse them to be in chronological order
        for row in reversed(rows):
            history_payload.append({"role": row["role"], "content": row["content"]})
    except Exception as e:
        logger.error(f"Failed to fetch history context: {str(e)}")

    # Append current user query
    history_payload.append({"role": "user", "content": message_content})

    thinking_mode = chat_request.thinking or False
    agent_system_prompt = chat_request.agent_system_prompt or None

    start_time = time.time()
    try:
        reply_content, actual_model, search_query, search_results = openrouter_client.call_openrouter(
            message=message_content,
            requested_model=model_used,
            history=history_payload,
            thinking=thinking_mode,
            agent_system_prompt=agent_system_prompt
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenRouter service exception: {str(e)}")
    
    latency_ms = int((time.time() - start_time) * 1000)

    # 4. Save interactions and cache results
    try:
        now = datetime.utcnow()
        # Save user message
        user_msg_id = str(uuid.uuid4())
        db.messages.insert_one({
            "id": user_msg_id, "session_id": session_id, "role": "user", 
            "content": message_content, "timestamp": now, "model_used": actual_model
        })
        # Save assistant message
        asst_msg_id = str(uuid.uuid4())
        import json
        
        db.messages.insert_one({
            "id": asst_msg_id, "session_id": session_id, "role": "assistant", 
            "content": reply_content, "timestamp": now, "model_used": actual_model,
            "search_query": search_query, "search_results": search_results
        })
    except Exception as e:
        logger.error(f"Error saving live message interaction: {str(e)}")

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
        latency_ms=latency_ms,
        search_query=search_query,
        search_results=search_results
    )

@router.get("/limits", response_model=RateLimitInfo)
async def get_limits(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    rate_limit_key = get_client_identifier(request, session_id, user["id"])
    limits = rate_limiter.get_remaining_limits(rate_limit_key)
    return RateLimitInfo(
        rpm_limit=limits["rpm_limit"],
        rpm_remaining=limits["rpm_remaining"],
        daily_limit=limits["daily_limit"],
        daily_remaining=limits["daily_remaining"]
    )
