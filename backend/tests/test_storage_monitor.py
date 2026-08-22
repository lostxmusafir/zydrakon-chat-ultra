import os
import pytest
from fastapi.testclient import TestClient

os.environ["MONGODB_URL"] = "mongodb+srv://tavishyadrc_db_user:4vGp7yoBAAT91hip@zydrakon-ai.nueargp.mongodb.net/?appName=Zydrakon-AI"
os.environ["MONGO_DB_NAME"] = "test_zydrakon_storage"

from backend.main import app
from backend.models.database import get_db, init_db
from backend.utils.auth import get_current_user
from backend.services.storage_monitor import (
    get_storage_status,
    check_and_enforce_storage_limits,
    set_test_storage_bytes
)
from backend.utils.config import settings

def override_get_current_user():
    return {
        "id": "test-user-storage",
        "email": "storage_test@example.com",
        "name": "Storage Test User"
    }

app.dependency_overrides[get_current_user] = override_get_current_user
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    db = get_db()
    for col in db.list_collection_names():
        db.drop_collection(col)
    init_db()
    set_test_storage_bytes(None)
    yield
    for col in db.list_collection_names():
        db.drop_collection(col)
    set_test_storage_bytes(None)

def test_storage_status_normal():
    set_test_storage_bytes(50 * 1024 * 1024) # 50 MB out of 512 MB (~9.7%)
    status = get_storage_status()
    assert status["used_percent"] < 80.0
    assert status["warning_80"] is False
    assert status["critical_90"] is False

def test_storage_status_80_percent_warning():
    max_bytes = settings.MAX_DB_SIZE_MB * 1024 * 1024
    set_test_storage_bytes(max_bytes * 0.82) # 82%
    status = check_and_enforce_storage_limits()
    assert status["used_percent"] == 82.0
    assert status["warning_80"] is True
    assert status["critical_90"] is False
    assert status["purged"] is False
    assert "Jaldi hi aapki history delete kar di jayegi" in status["message"]

def test_storage_status_90_percent_auto_purge():
    db = get_db()
    # Insert dummy message & session
    db.sessions.insert_one({"id": "sess-1", "user_id": "test-user-storage"})
    db.messages.insert_one({"id": "msg-1", "session_id": "sess-1", "role": "user", "content": "Hello world"})
    
    max_bytes = settings.MAX_DB_SIZE_MB * 1024 * 1024
    set_test_storage_bytes(max_bytes * 0.92) # 92%
    
    # Run enforcement check
    status = check_and_enforce_storage_limits()
    assert status["purged"] is True
    
    # Verify DB collections were purged
    assert db.messages.count_documents({}) == 0
    assert db.sessions.count_documents({}) == 0

def test_storage_status_endpoint():
    max_bytes = settings.MAX_DB_SIZE_MB * 1024 * 1024
    set_test_storage_bytes(max_bytes * 0.85) # 85%
    response = client.get("/api/sessions/storage-status")
    assert response.status_code == 200
    data = response.json()
    assert data["used_percent"] == 85.0
    assert data["warning_80"] is True
