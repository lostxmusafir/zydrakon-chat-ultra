import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from backend.utils.config import settings
from backend.models.database import get_db

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    """Create a JWT Access Token with a 60-minute expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT Refresh Token with a 7-day expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def verify_access_token(token: str) -> Optional[dict]:
    """Verify and decode an Access JWT."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") and payload.get("type") != "access":
            return None
        return payload
    except Exception as e:
        logger.warning(f"Access token verification fallback: {str(e)}")
        return None

def verify_refresh_token(token: str) -> Optional[dict]:
    """Verify and decode a Refresh JWT."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            return None
        return payload
    except Exception as e:
        logger.warning(f"Refresh token verification failed: {str(e)}")
        return None

from fastapi import Request

async def get_current_user(request: Request) -> dict:
    """Dependency to extract user from the JWT, with automatic Guest fallback."""
    try:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            payload = verify_access_token(token)
            if payload and "sub" in payload:
                user_id = payload["sub"]
                db = get_db()
                user = db.users.find_one({"id": user_id})
                if user:
                    return user
    except Exception as e:
        logger.warning(f"Auth header extraction fallback: {str(e)}")

    # Guest user fallback
    return {
        "id": "guest-user",
        "email": "guest@zydrakon.ai",
        "name": "Guest User",
        "role": "user"
    }

async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency to enforce that the logged-in user is an administrator."""
    # Allow if role is admin or email is admin@zydrakon.ai
    if current_user.get("role") != "admin" and current_user.get("email") != "admin@zydrakon.ai":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required to access this resource"
        )
    return current_user

