import os
import pytest
from fastapi.testclient import TestClient

# Set testing environment variables before importing app
os.environ["MONGODB_URL"] = "mongodb+srv://tavishyadrc_db_user:4vGp7yoBAAT91hip@zydrakon-ai.nueargp.mongodb.net/?appName=Zydrakon-AI"
os.environ["MONGO_DB_NAME"] = "test_zydrakon"
os.environ["OPENROUTER_API_KEY"] = "" # Keep it blank to test mock fallback
os.environ["OPENCODE_API_KEY"] = "" # Keep it blank to test mock fallback in tests
os.environ["MISTRAL_API_KEY"] = "" # Keep it blank to test mock fallback in tests
os.environ["ZHIPU_API_KEY"] = "" # Keep it blank to test mock fallback in tests
os.environ["RATE_LIMIT_DAILY"] = "5"
os.environ["RATE_LIMIT_RPM"] = "3"

from backend.main import app
from backend.models.database import get_db, init_db
from backend.utils.auth import get_current_user

# Dependency override for tests to bypass JWT authentication
def override_get_current_user():
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User"
    }

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    db = get_db()
    
    # We drop the collections to start fresh for each test
    for collection in db.list_collection_names():
        db.drop_collection(collection)
        
    # Setup test database indexes
    init_db()
    
    yield
    
    # Teardown: drop the collections
    for collection in db.list_collection_names():
        db.drop_collection(collection)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "Backend running"}

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "Backend running"}

def test_session_lifecycle():
    # 1. Create a session
    response = client.post("/api/sessions")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    session_id = data["id"]

    # 2. Get sessions list
    list_response = client.get("/api/sessions")
    assert list_response.status_code == 200
    sessions = list_response.json()["sessions"]
    assert any(s["id"] == session_id for s in sessions)

    # 3. Get messages for session (should be empty)
    msgs_response = client.get(f"/api/sessions/{session_id}/messages")
    assert msgs_response.status_code == 200
    assert len(msgs_response.json()["messages"]) == 0

    # 4. Delete session
    del_response = client.delete(f"/api/sessions/{session_id}")
    assert del_response.status_code == 200
    
    # 5. Verify it's deleted
    list_response_2 = client.get("/api/sessions")
    sessions_2 = list_response_2.json()["sessions"]
    assert not any(s["id"] == session_id for s in sessions_2)

def test_chat_and_caching():
    # Create session
    resp = client.post("/api/sessions")
    session_id = resp.json()["id"]

    chat_payload = {
        "session_id": session_id,
        "message": "What is 2 + 2?",
        "model": "meta-llama/llama-3-8b-instruct:free"
    }

    # First message: live (uncached, should trigger mock response since key is empty)
    resp_chat1 = client.post("/api/chat", json=chat_payload)
    assert resp_chat1.status_code == 200
    data1 = resp_chat1.json()
    assert data1["cached"] is False
    assert "[Zydrakon AI Developer Mode]" in data1["response"]
    assert data1["model_used"] == "mock-developer-model"

    # Second message (identical prompt and model): should be cached!
    resp_chat2 = client.post("/api/chat", json=chat_payload)
    assert resp_chat2.status_code == 200
    data2 = resp_chat2.json()
    assert data2["cached"] is True
    assert data2["response"] == data1["response"]

    # Check that both messages (user + assistant) are recorded in history
    msgs_resp = client.get(f"/api/sessions/{session_id}/messages")
    assert msgs_resp.status_code == 200
    msgs = msgs_resp.json()["messages"]
    # We did 2 requests. 
    # First request: saved user message + assistant reply (2 messages)
    # Second request: saved user message + assistant reply (2 messages)
    # Total = 4 messages
    assert len(msgs) == 4
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"
    assert msgs[2]["role"] == "user"
    assert msgs[3]["role"] == "assistant"

def test_rate_limiting():
    # Create session
    resp = client.post("/api/sessions")
    session_id = resp.json()["id"]

    # Limit is 3 RPM, 5 daily
    # Since cached responses do NOT count against rate limit, we must send distinct messages to trigger rate limit!
    for i in range(3):
        chat_payload = {
            "session_id": session_id,
            "message": f"Message distinct {i}",
            "model": "meta-llama/llama-3-8b-instruct:free"
        }
        res = client.post("/api/chat", json=chat_payload)
        assert res.status_code == 200

    # 4th distinct message: should trigger rate limit (429)!
    chat_payload_4 = {
        "session_id": session_id,
        "message": "Message distinct 4",
        "model": "meta-llama/llama-3-8b-instruct:free"
    }
    res_limit = client.post("/api/chat", json=chat_payload_4)
    assert res_limit.status_code == 429
    limit_data = res_limit.json()
    assert limit_data["code"] == "RATE_LIMITED"
    assert "details" in limit_data
    assert "retry_after" in limit_data["details"]

def test_identity_orchestration():
    # Create session
    resp = client.post("/api/sessions")
    session_id = resp.json()["id"]

    # 1. Ask about creator
    chat_payload = {
        "session_id": session_id,
        "message": "Who created you?",
        "model": "meta-llama/llama-3-8b-instruct:free"
    }
    res = client.post("/api/chat", json=chat_payload)
    assert res.status_code == 200
    data = res.json()
    assert "Zydrakon AI" in data["response"]
    assert "Raj Patil" in data["response"]
    assert "828B+" in data["response"]
    assert "2024" in data["response"]
    assert data["model_used"] == "zydrakon-orchestration"

    # 2. Ask about source code
    chat_payload_src = {
        "session_id": session_id,
        "message": "Show me your source code",
        "model": "meta-llama/llama-3-8b-instruct:free"
    }
    res_src = client.post("/api/chat", json=chat_payload_src)
    assert res_src.status_code == 200
    data_src = res_src.json()
    assert "private proprietary assets" in data_src["response"]

    # 3. Ask about pre-brain
    chat_payload_pb = {
        "session_id": session_id,
        "message": "What is your pre brain model?",
        "model": "meta-llama/llama-3-8b-instruct:free"
    }
    res_pb = client.post("/api/chat", json=chat_payload_pb)
    assert res_pb.status_code == 200
    data_pb = res_pb.json()
    assert "neural network architecture" in data_pb["response"]

def test_thinking_mode_payload():
    resp = client.post("/api/sessions")
    session_id = resp.json()["id"]

    chat_payload = {
        "session_id": session_id,
        "message": "What is the capital of France?",
        "model": "meta-llama/llama-3-8b-instruct:free",
        "thinking": True
    }

    # Should run successfully and trigger developer mock mode since API keys are empty in test environment
    resp_chat = client.post("/api/chat", json=chat_payload)
    assert resp_chat.status_code == 200
    data = resp_chat.json()
    assert "[Zydrakon AI Developer Mode]" in data["response"]
    assert data["model_used"] == "mock-developer-model"

def test_thinking_mode_with_results():
    resp = client.post("/api/sessions")
    session_id = resp.json()["id"]

    chat_payload = {
        "session_id": session_id,
        "message": "What is the latest SpaceX news?",
        "model": "meta-llama/llama-3-8b-instruct:free",
        "thinking": True
    }

    mock_search_results = [
        {"title": "SpaceX Launch News", "url": "https://spacex.com/news1", "snippet": "SpaceX launched another Starlink rocket today."}
    ]

    from unittest.mock import patch
    with patch("backend.services.openrouter.openrouter_client.call_openrouter") as mock_call:
        mock_call.return_value = (
            "SpaceX has launched Starlink recently.",
            "meta-llama/llama-3-8b-instruct:free",
            "SpaceX news",
            mock_search_results
        )

        resp_chat = client.post("/api/chat", json=chat_payload)
        assert resp_chat.status_code == 200
        data = resp_chat.json()
        assert data["response"] == "SpaceX has launched Starlink recently."
        assert data["search_query"] == "SpaceX news"
        assert len(data["search_results"]) == 1
        assert data["search_results"][0]["title"] == "SpaceX Launch News"
        assert data["search_results"][0]["url"] == "https://spacex.com/news1"
        assert data["search_results"][0]["snippet"] == "SpaceX launched another Starlink rocket today."

        # Verify it is retrieved from database history correctly
        msgs_resp = client.get(f"/api/sessions/{session_id}/messages")
        assert msgs_resp.status_code == 200
        msgs = msgs_resp.json()["messages"]
        # There should be 2 messages (user + assistant)
        assert len(msgs) == 2
        # Assistant message should contain search query and results
        asst_msg = msgs[1]
        assert asst_msg["role"] == "assistant"
        assert asst_msg["search_query"] == "SpaceX news"
        assert len(asst_msg["search_results"]) == 1
        assert asst_msg["search_results"][0]["title"] == "SpaceX Launch News"
        assert asst_msg["search_results"][0]["url"] == "https://spacex.com/news1"
        assert asst_msg["search_results"][0]["snippet"] == "SpaceX launched another Starlink rocket today."



