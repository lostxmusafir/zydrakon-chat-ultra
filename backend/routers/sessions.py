import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from backend.models.database import get_db
from backend.models.schemas import SessionResponse, MessageResponse, SessionListResponse, MessagesListResponse
from backend.utils.auth import get_current_user

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.post("", response_model=SessionResponse)
async def create_session(user: dict = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    db = get_db()
    try:
        now = datetime.utcnow()
        db.sessions.insert_one({"id": session_id, "created_at": now, "user_id": user["id"]})
        # Note: if now is datetime object, isoformat() adds no Z unless timezone aware
        return SessionResponse(id=session_id, created_at=now.isoformat() + "Z")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.get("", response_model=SessionListResponse)
async def list_sessions(user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        cursor = db.sessions.find({"user_id": user["id"]}).sort("created_at", -1)
        sessions = []
        for doc in cursor:
            dt = doc["created_at"]
            dt_str = dt.isoformat() + "Z" if isinstance(dt, datetime) else dt
            sessions.append(SessionResponse(id=doc["id"], created_at=dt_str))
        return SessionListResponse(sessions=sessions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}")

@router.delete("/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        db.sessions.delete_one({"id": session_id, "user_id": user["id"]})
        # Explicitly delete associated messages because MongoDB doesn't have CASCADE delete
        db.messages.delete_many({"session_id": session_id})
        
        return {"status": "success", "message": f"Session {session_id} deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

@router.delete("")
async def delete_all_sessions(user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        user_id = user.get("id", "guest-user")
        db.sessions.delete_many({"user_id": user_id})
        db.messages.delete_many({})
        db.cached_responses.delete_many({})
        return {"status": "success", "message": "All sessions deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete all sessions: {str(e)}")

@router.get("/{session_id}/messages", response_model=MessagesListResponse)
async def get_messages(session_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        # First verify if session exists and belongs to user
        session = db.sessions.find_one({"id": session_id, "user_id": user["id"]})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or unauthorized")

        cursor = db.messages.find({"session_id": session_id}).sort("timestamp", 1)
        messages = []
        for doc in cursor:
            dt = doc["timestamp"]
            dt_str = dt.isoformat() + "Z" if isinstance(dt, datetime) else dt
            
            # Since search_results might be saved as a string (JSON) or a list (MongoDB)
            # handle both to be safe
            search_results = doc.get("search_results")
            if isinstance(search_results, str):
                try:
                    search_results = json.loads(search_results)
                except Exception:
                    pass

            messages.append(
                MessageResponse(
                    role=doc["role"],
                    content=doc["content"],
                    timestamp=dt_str,
                    model_used=doc.get("model_used"),
                    search_query=doc.get("search_query"),
                    search_results=search_results
                )
            )
        return MessagesListResponse(messages=messages)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")
