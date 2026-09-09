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

import base64
import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def _get_fernet():
    try:
        from cryptography.fernet import Fernet
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.JWT_SECRET.encode("utf-8")).digest())
        return Fernet(key)
    except Exception as e:
        logger.debug(f"Fernet unavailable or error: {e}")
        return None

def encrypt_password(plain_password: str) -> str:
    """Encrypt password symmetrically for admin view while MongoDB stores cipher."""
    if not plain_password:
        return ""
    f = _get_fernet()
    if f:
        try:
            return f.encrypt(plain_password.encode("utf-8")).decode("utf-8")
        except Exception as e:
            logger.error(f"Fernet password encryption failed: {e}")
    # Pure-python keyed stream cipher fallback
    raw = plain_password.encode("utf-8")
    key_bytes = hashlib.sha256(settings.JWT_SECRET.encode("utf-8")).digest()
    xored = bytes([b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(raw)])
    return "pyenc:" + base64.urlsafe_b64encode(xored).decode("utf-8")

def decrypt_password(cipher_text: str) -> str:
    """Decrypt cipher text back to plain password for admin view."""
    if not cipher_text:
        return ""
    if cipher_text.startswith("pyenc:"):
        try:
            raw_b64 = cipher_text[6:]
            xored = base64.urlsafe_b64decode(raw_b64.encode("utf-8"))
            key_bytes = hashlib.sha256(settings.JWT_SECRET.encode("utf-8")).digest()
            plain = bytes([b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(xored)])
            return plain.decode("utf-8")
        except Exception as e:
            logger.error(f"Fallback password decryption failed: {e}")
            return ""
    f = _get_fernet()
    if f:
        try:
            return f.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
        except Exception as e:
            logger.error(f"Fernet password decryption failed: {e}")
            return ""
    return ""

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT Access Token. Grants 30 days for admin roles, or config default."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    elif data.get("role") == "admin" or data.get("email") == "admin@zydrakon.ai":
        expire = datetime.utcnow() + timedelta(days=30)
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT Refresh Token. Grants 60 days for admin roles, or config default."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    elif data.get("role") == "admin" or data.get("email") == "admin@zydrakon.ai":
        expire = datetime.utcnow() + timedelta(days=60)
    else:
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
    """Dependency to extract user from the JWT, with automatic Guest fallback.
    If a Bearer token was provided but has expired or is invalid, raises 401 so the client can refresh."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1].strip()
        payload = verify_access_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired or is invalid. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = payload.get("sub")
        db = get_db()
        user = db.users.find_one({"id": user_id})
        if not user:
            try:
                from bson import ObjectId
                user = db.users.find_one({"_id": ObjectId(user_id)})
            except Exception:
                pass
        if not user and payload.get("email"):
            user = db.users.find_one({"email": payload["email"]})
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found for credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Guest user fallback for endpoints called without any Bearer header
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

