import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from backend.models.database import get_db
from backend.models.schemas import SessionResponse, MessageResponse, SessionListResponse, MessagesListResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.post("", response_model=SessionResponse)
async def create_session():
    session_id = str(uuid.uuid4())
    conn = get_db()
    try:
        conn.execute("INSERT INTO sessions (id) VALUES (?);", (session_id,))
        conn.commit()
        return SessionResponse(id=session_id, created_at=datetime.utcnow().isoformat())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")
    finally:
        conn.close()

@router.get("", response_model=SessionListResponse)
async def list_sessions():
    conn = get_db()
    try:
        cursor = conn.execute("SELECT id, created_at FROM sessions ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        sessions = [SessionResponse(id=row["id"], created_at=row["created_at"]) for row in rows]
        return SessionListResponse(sessions=sessions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}")
    finally:
        conn.close()

@router.delete("/{session_id}")
async def delete_session(session_id: str):
    conn = get_db()
    try:
        cursor = conn.execute("SELECT id FROM sessions WHERE id = ?;", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # SQLite with PRAGMA foreign_keys = ON will cascade delete messages automatically
        conn.execute("DELETE FROM sessions WHERE id = ?;", (session_id,))
        conn.commit()
        return {"status": "success", "message": f"Session {session_id} deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")
    finally:
        conn.close()

@router.get("/{session_id}/messages", response_model=MessagesListResponse)
async def get_messages(session_id: str):
    conn = get_db()
    try:
        # First verify if session exists
        cursor_session = conn.execute("SELECT id FROM sessions WHERE id = ?;", (session_id,))
        if not cursor_session.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")

        cursor = conn.execute(
            "SELECT role, content, timestamp, model_used FROM messages WHERE session_id = ? ORDER BY timestamp ASC;",
            (session_id,)
        )
        rows = cursor.fetchall()
        messages = [
            MessageResponse(
                role=row["role"],
                content=row["content"],
                timestamp=row["timestamp"],
                model_used=row["model_used"]
            )
            for row in rows
        ]
        return MessagesListResponse(messages=messages)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")
    finally:
        conn.close()
