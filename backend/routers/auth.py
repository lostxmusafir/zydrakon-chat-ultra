import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from backend.utils.config import settings
from backend.utils.auth import create_access_token, create_refresh_token, verify_access_token, verify_refresh_token, get_password_hash, verify_password, get_current_user
from backend.models.database import get_db
from backend.models.schemas import User, UserLogin, ChangePasswordRequest, RefreshRequest, RefreshResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: User

class StatusResponse(BaseModel):
    status: str
    message: str

@router.post("/seed")
async def seed_test_users():
    """Seed administrator & test user accounts into MongoDB with bcrypt passwords."""
    db = get_db()
    test_accounts = [
        {
            "email": "admin@zydrakon.ai",
            "password": "admin123password",
            "name": "Admin User"
        },
        {
            "email": "user@zydrakon.ai",
            "password": "user123password",
            "name": "Test User"
        }
    ]
    created = []
    for acc in test_accounts:
        email = acc["email"].strip().lower()
        hashed = get_password_hash(acc["password"])
        user_doc = {
            "id": f"user-{uuid.uuid4().hex[:8]}",
            "email": email,
            "name": acc["name"],
            "hashed_password": hashed,
            "created_at": datetime.utcnow().isoformat()
        }
        db.users.update_one(
            {"email": email},
            {"$set": user_doc},
            upsert=True
        )
        created.append({"email": email, "password": acc["password"], "name": acc["name"]})
    return {"status": "success", "accounts": created}

@router.post("/register")
async def register():
    """Public sign-up is disabled."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public sign-up is disabled. Please contact your system administrator for access or log in with an existing account."
    )

@router.post("/login", response_model=AuthResponse)
async def login(user_in: UserLogin):
    db = get_db()
    
    # 1. Look up user by email
    user = db.users.find_one({"email": user_in.email.strip().lower()})
    if not user:
        # Fallback check without lowercasing if original exact string exists
        user = db.users.find_one({"email": user_in.email.strip()})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 2. Verify password with bcrypt
    hashed_pwd = user.get("hashed_password")
    if not hashed_pwd or not verify_password(user_in.password, hashed_pwd):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Generate 60-minute JWT access token & 7-day refresh token
    access_token = create_access_token(data={"sub": user["id"]})
    refresh_token = create_refresh_token(data={"sub": user["id"]})
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=User(
            id=user["id"],
            email=user["email"],
            name=user.get("name"),
            tier=user.get("tier", "free"),
            role=user.get("role", "admin" if user["email"] == "admin@zydrakon.ai" else "user"),
            allowed_models=user.get("allowed_models")
        )
    )

@router.post("/refresh", response_model=RefreshResponse)
async def refresh_tokens(req: RefreshRequest):
    """Refreshes a 60-minute access token using a valid 7-day refresh token."""
    payload = verify_refresh_token(req.refresh_token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload["sub"]
    db = get_db()
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please sign in again.",
        )

    new_access_token = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(data={"sub": user_id})

    return RefreshResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )

@router.post("/change-password", response_model=StatusResponse)
async def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("id") == "guest-user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Guest users cannot change password. Please log in first."
        )

    db = get_db()
    user = db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # 1. Verify old password using bcrypt
    if not verify_password(req.old_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # 2. Hash new password using bcrypt
    new_hashed_password = get_password_hash(req.new_password)

    # 3. Update in MongoDB users collection
    db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "hashed_password": new_hashed_password,
            "updated_at": datetime.utcnow()
        }}
    )

    logger.info(f"Password successfully changed for user {user['email']}")

    return StatusResponse(
        status="success",
        message="Password updated successfully. Please use your new password for future logins."
    )

@router.get("/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(
        id=current_user.get("id", "guest-user"),
        email=current_user.get("email", "guest@zydrakon.ai"),
        name=current_user.get("name", "Guest User"),
        tier=current_user.get("tier", "free"),
        role=current_user.get("role", "admin" if current_user.get("email") == "admin@zydrakon.ai" else "user"),
        allowed_models=current_user.get("allowed_models")
    )
