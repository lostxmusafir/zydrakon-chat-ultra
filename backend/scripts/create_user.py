import sys
from pathlib import Path

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import uuid
from datetime import datetime
from backend.models.database import get_db, init_db
from backend.utils.auth import get_password_hash

USERS = [
    {
        "email": "jyash1730@gmail.com",
        "name": "Yash Jain",
        "password": "62661@yash",
        "tier": "gold",
        "allowed_models": ["zydrakon-free", "zhipu-free"]
    },
    {
        "email": "manjit19102004@gmail.com",
        "name": "Manjit",
        "password": "75480@manjit",
        "tier": "gold",
        "allowed_models": ["zydrakon-free", "zhipu-free"]
    }
]

def create_gold_users():
    init_db()
    db = get_db()
    
    for u in USERS:
        email = u["email"]
        name = u["name"]
        password = u["password"]
        tier = u["tier"]
        allowed_models = u["allowed_models"]
        hashed_password = get_password_hash(password)
        
        existing = db.users.find_one({"email": email})
        if existing:
            db.users.update_one(
                {"email": email},
                {"$set": {
                    "name": name,
                    "hashed_password": hashed_password,
                    "tier": tier,
                    "allowed_models": allowed_models
                }}
            )
            print(f"Updated existing user '{email}' ({name}) with {tier.capitalize()} tier.")
        else:
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": email,
                "name": name,
                "hashed_password": hashed_password,
                "created_at": datetime.utcnow(),
                "tier": tier,
                "allowed_models": allowed_models
            }
            db.users.insert_one(new_user)
            print(f"Created new user '{email}' ({name}, ID: {user_id}) with {tier.capitalize()} tier.")

if __name__ == "__main__":
    create_gold_users()
