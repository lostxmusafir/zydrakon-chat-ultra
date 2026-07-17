from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    session_id: str = Field(..., description="The unique session identifier")
    message: str = Field(..., min_length=1, description="The message content to query")
    model: Optional[str] = Field("meta-llama/llama-3-8b-instruct:free", description="Specific OpenRouter free model to use")
    thinking: Optional[bool] = Field(False, description="Enable thinking mode/websearch")

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str

class ChatResponse(BaseModel):
    response: str
    model_used: str
    cached: bool
    latency_ms: int
    search_query: Optional[str] = None
    search_results: Optional[List[SearchResult]] = None

class SessionResponse(BaseModel):
    id: str
    created_at: str

class MessageResponse(BaseModel):
    role: str
    content: str
    timestamp: str
    model_used: Optional[str] = None
    search_query: Optional[str] = None
    search_results: Optional[List[SearchResult]] = None

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
