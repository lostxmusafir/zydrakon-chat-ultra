import uuid
from datetime import datetime
from backend.models.database import get_db, init_db
from backend.utils.auth import get_password_hash

def create_gold_user():
    init_db()
    db = get_db()
    
    email = "jyash1730@gmail.com"
    name = "Yash Jain"
    password = "62661@yash"
    hashed_password = get_password_hash(password)
    
    existing = db.users.find_one({"email": email})
    if existing:
        db.users.update_one(
            {"email": email},
            {"$set": {
                "name": name,
                "hashed_password": hashed_password,
                "tier": "gold",
                "allowed_models": ["zydrakon-free", "zhipu-free"]
            }}
        )
        print(f"Updated existing user '{email}' with Gold tier and restricted models ['zydrakon-free', 'zhipu-free'].")
    else:
        user_id = str(uuid.uuid4())
        new_user = {
            "id": user_id,
            "email": email,
            "name": name,
            "hashed_password": hashed_password,
            "created_at": datetime.utcnow(),
            "tier": "gold",
            "allowed_models": ["zydrakon-free", "zhipu-free"]
        }
        db.users.insert_one(new_user)
        print(f"Created new user '{email}' (ID: {user_id}) with Gold tier and restricted models ['zydrakon-free', 'zhipu-free'].")

if __name__ == "__main__":
    create_gold_user()
