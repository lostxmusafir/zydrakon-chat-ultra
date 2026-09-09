import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field

from backend.models.database import get_db
from backend.utils.auth import get_current_admin, get_password_hash, encrypt_password, decrypt_password

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
    password: Optional[str] = None

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
        enc_pwd = u.get("encrypted_password")
        decrypted_pwd = decrypt_password(enc_pwd) if enc_pwd else None
        users_list.append(AdminUserResponse(
            id=user_id,
            email=u["email"],
            name=u.get("name"),
            role=u.get("role", "admin" if u["email"] == "admin@zydrakon.ai" else "user"),
            tier=u.get("tier", "free"),
            created_at=dt_str,
            password=decrypted_pwd
        ))
    return users_list

@router.post("/users", response_model=AdminUserResponse)
async def create_user(user_in: AdminUserCreate, admin: dict = Depends(get_current_admin)):
    """Create a new user account with hashed password and encrypted password."""
    db = get_db()
    email = user_in.email.strip().lower()
    
    # Check if user already exists
    if db.users.find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
        
    hashed_password = get_password_hash(user_in.password)
    encrypted_password = encrypt_password(user_in.password)
    user_id = f"user-{uuid.uuid4().hex[:8]}"
    created_time = datetime.utcnow().isoformat()
    
    user_doc = {
        "id": user_id,
        "email": email,
        "name": user_in.name,
        "hashed_password": hashed_password,
        "encrypted_password": encrypted_password,
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
        created_at=created_time,
        password=user_in.password
    )

@router.get("/logs", response_model=List[AdminLogResponse])
async def list_logs(admin: dict = Depends(get_current_admin)):
    """Retrieve chat/search queries made by users, showing user name and query.
    Enforces a strict 24-hour retention window for all users: logs older than 24h
    are automatically deleted, and only logs from the last 24 hours are returned.
    """
    db = get_db()
    
    # 24-hour cutoff threshold
    cutoff = datetime.utcnow() - timedelta(hours=24)
    cutoff_iso = cutoff.isoformat()
    
    # 1. Automatic active purge: delete any user messages & sessions older than 24 hours
    try:
        db.messages.delete_many({
            "$or": [
                {"timestamp": {"$lt": cutoff}},
                {"timestamp": {"$lt": cutoff_iso}}
            ]
        })
        db.sessions.delete_many({
            "$or": [
                {"created_at": {"$lt": cutoff}},
                {"created_at": {"$lt": cutoff_iso}}
            ]
        })
    except Exception as purge_err:
        logger.warning(f"Error during 24-hour log auto-purge: {str(purge_err)}")
        
    # 2. Fetch user queries within the last 24 hours, sorted by timestamp descending
    messages = list(
        db.messages.find({
            "role": "user",
            "$or": [
                {"timestamp": {"$gte": cutoff}},
                {"timestamp": {"$gte": cutoff_iso}}
            ]
        }).sort("timestamp", -1).limit(500)
    )
    if not messages:
        return []
        
    # 3. Extract unique session IDs to batch fetch sessions
    session_ids = list(set(msg["session_id"] for msg in messages if "session_id" in msg))
    sessions = {s["id"]: s for s in db.sessions.find({"id": {"$in": session_ids}})}
    
    # 4. Extract unique user IDs to batch fetch users
    user_ids = list(set(s["user_id"] for s in sessions.values() if s and "user_id" in s))
    users = {u["id"]: u for u in db.users.find({"id": {"$in": user_ids}})}
    
    # 5. Map queries to users
    logs = []
    for msg in messages:
        session = sessions.get(msg.get("session_id"))
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
        ts_str = ts.isoformat() + "Z" if isinstance(ts, datetime) else str(ts)
        
        logs.append(AdminLogResponse(
            user_name=user_name,
            user_email=user_email,
            query=msg.get("content", ""),
            timestamp=ts_str,
            session_id=msg.get("session_id", ""),
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


@router.post("/logout")
async def admin_logout(admin: dict = Depends(get_current_admin)):
    """Admin sign-out endpoint. JWT is stateless — client must clear the token.
    This endpoint confirms the session was valid at logout time."""
    logger.info(f"Admin signed out: {admin.get('email', 'unknown')}")
    return {"message": "Signed out successfully", "email": admin.get("email")}
