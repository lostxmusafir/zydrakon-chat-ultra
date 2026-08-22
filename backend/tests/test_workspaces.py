import os
import pytest
from fastapi.testclient import TestClient

os.environ["MONGODB_URL"] = "mongodb+srv://tavishyadrc_db_user:4vGp7yoBAAT91hip@zydrakon-ai.nueargp.mongodb.net/?appName=Zydrakon-AI"
os.environ["MONGO_DB_NAME"] = "test_zydrakon_workspaces"

from backend.main import app
from backend.models.database import get_db, init_db
from backend.utils.auth import get_current_user

def override_get_current_user():
    return {
        "id": "owner-user-id",
        "email": "owner@zydrakon.ai",
        "name": "Workspace Owner"
    }

app.dependency_overrides[get_current_user] = override_get_current_user
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    db = get_db()
    for col in db.list_collection_names():
        db.drop_collection(col)
    init_db()
    
    # Create valid registered users in db.users
    db.users.insert_one({
        "id": "owner-user-id",
        "email": "owner@zydrakon.ai",
        "name": "Workspace Owner"
    })
    db.users.insert_one({
        "id": "member-user-id",
        "email": "member@zydrakon.ai",
        "name": "Valid Member User"
    })
    yield
    for col in db.list_collection_names():
        db.drop_collection(col)

def test_workspace_creation_and_listing():
    # Create workspace
    response = client.post("/api/workspaces", json={"name": "Engineering Team", "description": "Core dev team workspace"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Engineering Team"
    assert data["owner_id"] == "owner-user-id"
    assert len(data["members"]) == 1
    assert data["members"][0]["email"] == "owner@zydrakon.ai"

    # List workspaces
    list_res = client.get("/api/workspaces")
    assert list_res.status_code == 200
    ws_list = list_res.json()
    assert len(ws_list) == 1
    assert ws_list[0]["id"] == data["id"]

def test_add_valid_and_invalid_members():
    # 1. Create workspace
    ws_res = client.post("/api/workspaces", json={"name": "Research Group"})
    ws_id = ws_res.json()["id"]

    # 2. Try adding unregistered email (should fail with 404)
    invalid_res = client.post(f"/api/workspaces/{ws_id}/members", json={"email": "notregistered@example.com"})
    assert invalid_res.status_code == 404
    assert "not a registered user" in invalid_res.json()["detail"]

    # 3. Add valid registered user email (should succeed)
    valid_res = client.post(f"/api/workspaces/{ws_id}/members", json={"email": "member@zydrakon.ai"})
    assert valid_res.status_code == 200
    members = valid_res.json()["members"]
    assert len(members) == 2
    emails = [m["email"] for m in members]
    assert "member@zydrakon.ai" in emails

def test_workspace_team_chat_messaging():
    ws_res = client.post("/api/workspaces", json={"name": "Chat Channel"})
    ws_id = ws_res.json()["id"]

    # Send message in workspace
    msg_res = client.post(f"/api/workspaces/{ws_id}/messages", json={"content": "Hello team!", "ask_ai": False})
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert msg_data["content"] == "Hello team!"
    assert msg_data["sender_email"] == "owner@zydrakon.ai"

    # Retrieve workspace messages
    list_msgs = client.get(f"/api/workspaces/{ws_id}/messages")
    assert list_msgs.status_code == 200
    msgs = list_msgs.json()
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Hello team!"
