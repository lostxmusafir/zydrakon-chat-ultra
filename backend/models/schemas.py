from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    session_id: str = Field(..., description="The unique session identifier")
    message: str = Field(..., min_length=1, description="The message content to query")
    model: Optional[str] = Field("meta-llama/llama-3-8b-instruct:free", description="Specific OpenRouter free model to use")
    thinking: Optional[bool] = Field(False, description="Enable thinking mode/websearch")
    agent_system_prompt: Optional[str] = Field(None, description="Optional agent persona system prompt to prepend")


class User(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    tier: Optional[str] = "free"
    role: Optional[str] = "user"
    allowed_models: Optional[List[str]] = None

class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters)")

class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid 7-day refresh token")

class RefreshResponse(BaseModel):
    access_token: str = Field(..., description="New 12-hour access token")
    refresh_token: str = Field(..., description="Renewed 7-day refresh token")
    token_type: str = "bearer"

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str

class RouteInfo(BaseModel):
    origin: Optional[str] = None
    destination: str
    travel_mode: Optional[str] = "driving"
    maps_url: str

class ChatResponse(BaseModel):
    response: str
    model_used: str
    cached: bool
    latency_ms: int
    search_query: Optional[str] = None
    search_results: Optional[List[SearchResult]] = None
    storage_status: Optional[Dict[str, Any]] = None
    route_info: Optional[RouteInfo] = None

class SessionResponse(BaseModel):
    id: str
    created_at: str

class MessageResponse(BaseModel):
    id: Optional[str] = None
    role: str
    content: str
    timestamp: str
    model_used: Optional[str] = None
    search_query: Optional[str] = None
    search_results: Optional[List[SearchResult]] = None
    route_info: Optional[RouteInfo] = None

class MessagesListResponse(BaseModel):
    messages: List[MessageResponse]

class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]

class RateLimitInfo(BaseModel):
    rpm_limit: int
    rpm_remaining: int
    daily_limit: int
    daily_remaining: int

class ErrorResponse(BaseModel):
    status: str = "error"
    code: str
    message: str
    details: Dict[str, Any] = {}

class ReplayRequest(BaseModel):
    session_id: str
    message_id: str
    model: Optional[str] = None
    thinking: Optional[bool] = None

class BranchRequest(BaseModel):
    session_id: str
    message_id: str

class ProveItRequest(BaseModel):
    session_id: str
    message_id: str
    model: Optional[str] = None

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=300)

class WorkspaceAddMember(BaseModel):
    email: str = Field(..., min_length=3, description="Email of valid registered user to add")

class WorkspaceMemberInfo(BaseModel):
    id: str
    email: str
    name: str
    role: str  # "owner" | "member"

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    members: List[WorkspaceMemberInfo]
    created_at: str

class WorkspaceMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    model: Optional[str] = Field("meta-llama/llama-3-8b-instruct:free")
    ask_ai: Optional[bool] = Field(False, description="Whether to trigger an AI answer in team chat")

class WorkspaceMessageResponse(BaseModel):
    id: str
    workspace_id: str
    sender_id: str
    sender_name: str
    sender_email: str
    content: str
    timestamp: str
    model_used: Optional[str] = None
    is_ai: bool = False

