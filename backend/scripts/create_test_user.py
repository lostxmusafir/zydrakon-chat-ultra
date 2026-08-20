import sys
import uuid
from datetime import datetime
from pathlib import Path

# Add backend parent path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.utils.auth import get_password_hash
from backend.models.database import get_db

def create_users():
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

    print("--- Creating Test User Accounts ---")
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
        
        # Upsert into users collection
        db.users.update_one(
            {"email": email},
            {"$set": user_doc},
            upsert=True
        )
        print(f"✅ Success! Account created/updated:")
        print(f"   Email:    {email}")
        print(f"   Password: {acc['password']}")
        print(f"   Name:     {acc['name']}\n")

if __name__ == "__main__":
    create_users()
