import sys
import jwt
from datetime import datetime, timedelta
from pathlib import Path

# Add backend parent path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.utils.config import settings
from backend.utils.auth import (
    create_access_token,
    create_refresh_token,
    verify_access_token,
    verify_refresh_token,
    get_password_hash,
)
from backend.models.database import get_db

def run_tests():
    print("==================================================")
    print("   RUNNING JWT 12-HOUR & 7-DAY REFRESH TOKEN TESTS")
    print("==================================================")

    # 1. Test Access Token Expiry (12 Hours)
    user_payload = {"sub": "user-test-123", "email": "user@zydrakon.ai"}
    access_token = create_access_token(user_payload)
    decoded_access = verify_access_token(access_token)
    
    assert decoded_access is not None, "Access token verification failed!"
    assert decoded_access.get("type") == "access", "Token type must be 'access'!"
    assert decoded_access.get("sub") == "user-test-123", "Subject claim mismatch!"
    
    exp_time = datetime.utcfromtimestamp(decoded_access["exp"])
    now_time = datetime.utcnow()
    hours_left = (exp_time - now_time).total_seconds() / 3600.0
    print(f"✅ Access Token Expiration Duration: {hours_left:.2f} hours (Target: 12.0 hours)")
    assert 11.9 <= hours_left <= 12.1, f"Access token duration {hours_left:.2f}h is not 12 hours!"

    # 2. Test Refresh Token Expiry (7 Days)
    refresh_token = create_refresh_token(user_payload)
    decoded_refresh = verify_refresh_token(refresh_token)
    
    assert decoded_refresh is not None, "Refresh token verification failed!"
    assert decoded_refresh.get("type") == "refresh", "Token type must be 'refresh'!"
    assert decoded_refresh.get("sub") == "user-test-123", "Subject claim mismatch!"
    
    ref_exp_time = datetime.utcfromtimestamp(decoded_refresh["exp"])
    days_left = (ref_exp_time - now_time).total_seconds() / 86400.0
    print(f"✅ Refresh Token Expiration Duration: {days_left:.2f} days (Target: 7.0 days)")
    assert 6.9 <= days_left <= 7.1, f"Refresh token duration {days_left:.2f}d is not 7 days!"

    # 3. Test Type Isolation (Access token cannot be used as Refresh token and vice versa)
    assert verify_refresh_token(access_token) is None, "Access token must NOT be accepted as Refresh token!"
    assert verify_access_token(refresh_token) is None, "Refresh token must NOT be accepted as Access token!"
    print("✅ Strict Token Type Isolation Verified (Access vs Refresh)")

    # 4. Database User Seeding Verification
    db = get_db()
    test_user = db.users.find_one({"email": "user@zydrakon.ai"})
    assert test_user is not None, "Test user 'user@zydrakon.ai' not found in database!"
    print(f"✅ Database User Found: {test_user['name']} ({test_user['email']})")

    print("\n==================================================")
    print("🎉 ALL JWT 12-HOUR & 7-DAY REFRESH TOKEN TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
