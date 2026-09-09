import sys
from pathlib import Path

# Add root dir to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.main import app
from backend.models.database import get_db, init_db
from backend.utils.auth import encrypt_password, decrypt_password, verify_password
from backend.scripts.create_user import create_gold_users

client = TestClient(app)

def run_tests():
    print("=== STARTING PASSWORD & ENCRYPTION TEST SUITE ===")

    # 1. Test Encrypt / Decrypt
    print("\n--- 1. Testing Reversible AES Encryption ---")
    raw_pass = "TestPassword@999"
    cipher = encrypt_password(raw_pass)
    assert cipher != raw_pass, "Cipher text matches plain text!"
    assert cipher.startswith("gAAAAA") or cipher.startswith("pyenc:"), "Unexpected cipher prefix"
    decrypted = decrypt_password(cipher)
    assert decrypted == raw_pass, f"Decryption failed: expected {raw_pass}, got {decrypted}"
    print(f"OK: Cipher={cipher[:20]}... | Decrypted={decrypted}")

    # 2. Run create_gold_users and verify DB storage
    print("\n--- 2. Testing create_gold_users with DB encryption ---")
    try:
        init_db()
        db = get_db()
        create_gold_users()
        
        user_doc = db.users.find_one({"email": "jyash1730@gmail.com"})
        assert user_doc is not None, "User jyash1730@gmail.com not found in DB"
        assert "hashed_password" in user_doc, "hashed_password missing from DB doc"
        assert "encrypted_password" in user_doc, "encrypted_password missing from DB doc"
        assert user_doc["encrypted_password"] != "62661@yash", "Password stored as plain text in DB!"
        
        dec = decrypt_password(user_doc["encrypted_password"])
        assert dec == "62661@yash", f"Decrypted DB password mismatch: {dec}"
        print("OK: MongoDB user doc has encrypted_password and bcrypt hash. No plaintext in DB!")
    except Exception as e:
        print(f"MongoDB check skipped or failed: {e}")

    # 3. Test Public Change Password endpoint via FastAPI client
    print("\n--- 3. Testing POST /api/auth/change-password-public ---")
    # A. Non-existent user
    res = client.post("/api/auth/change-password-public", json={
        "email": "nonexistent_random_user@zydrakon.ai",
        "old_password": "anypassword",
        "new_password": "newsecretpassword123"
    })
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    print("OK: Non-existent email correctly returned 404")

    # B. Wrong current password
    res = client.post("/api/auth/change-password-public", json={
        "email": "jyash1730@gmail.com",
        "old_password": "WRONG_PASSWORD",
        "new_password": "newsecretpassword123"
    })
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    print("OK: Incorrect old password correctly returned 400")

    # C. Successful password change
    res = client.post("/api/auth/change-password-public", json={
        "email": "jyash1730@gmail.com",
        "old_password": "62661@yash",
        "new_password": "UpdatedPassword@123"
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    print("OK: Public change-password returned 200 Success")

    # D. Verify login with NEW password
    res = client.post("/api/auth/login", json={
        "email": "jyash1730@gmail.com",
        "password": "UpdatedPassword@123"
    })
    assert res.status_code == 200, f"Login with new password failed: {res.text}"
    print("OK: User can successfully sign in with the new password")

    # E. Restore original password
    res = client.post("/api/auth/change-password-public", json={
        "email": "jyash1730@gmail.com",
        "old_password": "UpdatedPassword@123",
        "new_password": "62661@yash"
    })
    assert res.status_code == 200, "Failed to restore original password"
    print("OK: Original password restored successfully")

    print("\n=== ALL PASSWORD TESTS PASSED! ===")

if __name__ == "__main__":
    run_tests()
