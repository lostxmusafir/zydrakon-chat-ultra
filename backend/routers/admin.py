import uuid
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field

from backend.models.database import get_db
from backend.utils.auth import get_current_admin, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["admin"])
logger = logging.getLogger(__name__)

# Request and Response Schemas
class AdminUserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: Optional[str] = "user"
    tier: Optional[str] = "free"
    created_at: Optional[str] = None

class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)
    role: Optional[str] = "user"
    tier: Optional[str] = "free"

class AdminLogResponse(BaseModel):
    user_name: str
    user_email: str
    query: str
    timestamp: str
    session_id: str
    model_used: Optional[str] = None

@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(admin: dict = Depends(get_current_admin)):
    """List all registered users in the database."""
    db = get_db()
    users_cursor = db.users.find()
    users_list = []
    for u in users_cursor:
        dt = u.get("created_at")
        dt_str = dt.isoformat() + "Z" if isinstance(dt, datetime) else str(dt) if dt else None
        user_id = u.get("id") or str(u["_id"])
        users_list.append(AdminUserResponse(
            id=user_id,
            email=u["email"],
            name=u.get("name"),
            role=u.get("role", "admin" if u["email"] == "admin@zydrakon.ai" else "user"),
            tier=u.get("tier", "free"),
            created_at=dt_str
        ))
    return users_list

@router.post("/users", response_model=AdminUserResponse)
async def create_user(user_in: AdminUserCreate, admin: dict = Depends(get_current_admin)):
    """Create a new user account with hashed password."""
    db = get_db()
    email = user_in.email.strip().lower()
    
    # Check if user already exists
    if db.users.find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
        
    hashed_password = get_password_hash(user_in.password)
    user_id = f"user-{uuid.uuid4().hex[:8]}"
    created_time = datetime.utcnow().isoformat()
    
    user_doc = {
        "id": user_id,
        "email": email,
        "name": user_in.name,
        "hashed_password": hashed_password,
        "role": user_in.role,
        "tier": user_in.tier,
        "allowed_models": (
            ["zydrakon-free", "zhipu-free", "zydrakon-premium"] if user_in.tier == "premium"
            else ["zydrakon-free", "zhipu-free"] if user_in.tier == "gold"
            else ["zydrakon-free"]
        ),
        "created_at": created_time
    }
    
    db.users.insert_one(user_doc)
    logger.info(f"Admin {admin['email']} successfully created user {email} (ID: {user_id})")
    
    return AdminUserResponse(
        id=user_id,
        email=email,
        name=user_in.name,
        role=user_in.role,
        tier=user_in.tier,
        created_at=created_time
    )

@router.get("/logs", response_model=List[AdminLogResponse])
async def list_logs(admin: dict = Depends(get_current_admin)):
    """Retrieve chat/search queries made by users, showing user name and query."""
    db = get_db()
    
    # 1. Fetch user role messages, sorted by timestamp descending, limit to last 100
    messages = list(db.messages.find({"role": "user"}).sort("timestamp", -1).limit(100))
    if not messages:
        return []
        
    # 2. Extract unique session IDs to batch fetch sessions
    session_ids = list(set(msg["session_id"] for msg in messages))
    sessions = {s["id"]: s for s in db.sessions.find({"id": {"$in": session_ids}})}
    
    # 3. Extract unique user IDs to batch fetch users
    user_ids = list(set(s["user_id"] for s in sessions.values() if s))
    users = {u["id"]: u for u in db.users.find({"id": {"$in": user_ids}})}
    
    # 4. Map queries to users
    logs = []
    for msg in messages:
        session = sessions.get(msg["session_id"])
        user_id = session.get("user_id") if session else "guest-user"
        user = users.get(user_id)
        
        user_name = "Guest User"
        user_email = "guest@zydrakon.ai"
        
        if user_id != "guest-user":
            if user:
                user_name = user.get("name") or "User"
                user_email = user.get("email")
            else:
                user_name = "Deleted User"
                user_email = "deleted@zydrakon.ai"
                
        # Format timestamp
        ts = msg.get("timestamp")
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts)
        
        logs.append(AdminLogResponse(
            user_name=user_name,
            user_email=user_email,
            query=msg["content"],
            timestamp=ts_str,
            session_id=msg["session_id"],
            model_used=msg.get("model_used", "unknown")
        ))
        
    return logs

class UserTierUpdate(BaseModel):
    tier: str

@router.put("/users/{user_id}/tier", response_model=AdminUserResponse)
async def update_user_tier(user_id: str, tier_in: UserTierUpdate, admin: dict = Depends(get_current_admin)):
    """Update a user's tier and their allowed models list."""
    db = get_db()
    from bson import ObjectId
    # Support both custom 'id' string field and MongoDB '_id'
    user = db.users.find_one({"id": user_id})
    if not user:
        try:
            user = db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier = tier_in.tier.strip().lower()
    if tier not in ["free", "gold", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Supported: free, gold, premium")
    
    allowed_models = (
        ["zydrakon-free", "zhipu-free", "zydrakon-premium"] if tier == "premium"
        else ["zydrakon-free", "zhipu-free"] if tier == "gold"
        else ["zydrakon-free"]
    )
    
    # Update by whichever key matches
    query = {"id": user["id"]} if user.get("id") else {"_id": user["_id"]}
    db.users.update_one(query, {"$set": {"tier": tier, "allowed_models": allowed_models}})
    
    updated_user = db.users.find_one(query)
    dt = updated_user.get("created_at")
    dt_str = dt.isoformat() + "Z" if isinstance(dt, datetime) else str(dt) if dt else None
    resolved_id = updated_user.get("id") or str(updated_user["_id"])
    
    return AdminUserResponse(
        id=resolved_id,
        email=updated_user["email"],
        name=updated_user.get("name"),
        role=updated_user.get("role", "user"),
        tier=updated_user["tier"],
        created_at=dt_str
    )

@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a user by ID. Admin account cannot be deleted."""
    db = get_db()
    from bson import ObjectId
    user = db.users.find_one({"id": user_id})
    if not user:
        try:
            user = db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete admin account")
    # Delete by whichever key works
    if user.get("id"):
        db.users.delete_one({"id": user["id"]})
    else:
        db.users.delete_one({"_id": user["_id"]})

