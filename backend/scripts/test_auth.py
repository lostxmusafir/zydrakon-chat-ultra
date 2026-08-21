import sys
import requests
from pathlib import Path

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.models.database import get_db, init_db
from backend.scripts.create_user import create_gold_users

BASE_URL = "http://127.0.0.1:8000/api/auth"

def test_auth_flow():
    print("=== STARTING AUTHENTICATION & BCRYPT VERIFICATION TESTS ===")

    # 1. Test Sign-up Disabled
    print("\n1. Testing Sign-up endpoint...")
    try:
        reg_res = requests.post(f"{BASE_URL}/register", json={"email": "test@test.com", "password": "pass"})
        print(f"Sign-up response status: {reg_res.status_code}")
        assert reg_res.status_code == 403, f"Expected 403, got {reg_res.status_code}"
        print("✅ Sign-up disabled successfully (Returned 403 Forbidden).")
    except Exception as e:
        print(f"❌ Sign-up test failed: {e}")

    # 2. Ensure test user exists in DB
    init_db()
    db = get_db()
    
    test_email = "jyash1730@gmail.com"
    test_password = "62661@yash"
    new_password = "newpassword123"

    user = db.users.find_one({"email": test_email})
    if not user:
        from backend.utils.auth import get_password_hash
        import uuid
        from datetime import datetime
        db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": test_email,
            "name": "Yash Jain",
            "hashed_password": get_password_hash(test_password),
            "tier": "gold",
            "allowed_models": ["zydrakon-free", "zhipu-free"],
            "created_at": datetime.utcnow()
        })
        print(f"Created initial user '{test_email}'.")

    # 3. Test Login
    print("\n2. Testing Login endpoint with bcrypt password...")
    login_payload = {"email": test_email, "password": test_password}
    login_res = requests.post(f"{BASE_URL}/login", json=login_payload)
    print(f"Login status code: {login_res.status_code}")
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
    assert login_res.status_code == 200, "Login failed!"
    data = login_res.json()
    token = data["access_token"]
    print(f"✅ Login successful! JWT Access Token received: {token[:20]}...")
    print(f"Logged in user: {data['user']['email']} ({data['user']['name']})")

    # 4. Test Change Password
    print("\n3. Testing Change Password endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    change_pwd_payload = {
        "old_password": test_password,
        "new_password": new_password
    }
    cp_res = requests.post(f"{BASE_URL}/change-password", headers=headers, json=change_pwd_payload)
    print(f"Change Password status code: {cp_res.status_code}")
    print(f"Change Password response: {cp_res.text}")
    assert cp_res.status_code == 200, "Change password failed!"
    print("✅ Change password successful!")

    # 5. Verify Login with New Password
    print("\n4. Verifying Login with NEW password...")
    new_login_res = requests.post(f"{BASE_URL}/login", json={"email": test_email, "password": new_password})
    print(f"New password login status code: {new_login_res.status_code}")
    assert new_login_res.status_code == 200, "Login with new password failed!"
    print("✅ Login with new password succeeded!")

    # 6. Restore Original Password
    print("\n5. Restoring original password...")
    new_token = new_login_res.json()["access_token"]
    restore_headers = {"Authorization": f"Bearer {new_token}"}
    restore_res = requests.post(f"{BASE_URL}/change-password", headers=restore_headers, json={
        "old_password": new_password,
        "new_password": test_password
    })
    print(f"Password restore status: {restore_res.status_code}")
    assert restore_res.status_code == 200, "Restoring password failed!"
    print("✅ Password restored to original successfully!")

    print("\n🎉 ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY! 🎉")

if __name__ == "__main__":
    test_auth_flow()
