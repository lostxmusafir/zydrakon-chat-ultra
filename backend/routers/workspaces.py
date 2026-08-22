import uuid
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status

from backend.models.database import get_db
from backend.models.schemas import (
    WorkspaceCreate,
    WorkspaceAddMember,
    WorkspaceResponse,
    WorkspaceMemberInfo,
    WorkspaceMessageCreate,
    WorkspaceMessageResponse
)
from backend.utils.auth import get_current_user
from backend.services.openrouter import openrouter_client

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])
logger = logging.getLogger(__name__)

def helper_format_ws(ws_doc: dict) -> WorkspaceResponse:
    members = [
        WorkspaceMemberInfo(
            id=m["id"],
            email=m["email"],
            name=m.get("name") or m["email"].split("@")[0],
            role=m.get("role", "member")
        )
        for m in ws_doc.get("members", [])
    ]
    created_at = ws_doc["created_at"]
    created_at_str = created_at.isoformat() + "Z" if isinstance(created_at, datetime) else str(created_at)
    return WorkspaceResponse(
        id=ws_doc["id"],
        name=ws_doc["name"],
        description=ws_doc.get("description"),
        owner_id=ws_doc["owner_id"],
        members=members,
        created_at=created_at_str
    )

@router.post("", response_model=WorkspaceResponse)
async def create_workspace(req: WorkspaceCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    ws_id = f"ws-{uuid.uuid4().hex[:10]}"
    now = datetime.utcnow()
    
    owner_member = {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name") or user["email"].split("@")[0],
        "role": "owner"
    }
    
    ws_doc = {
        "id": ws_id,
        "name": req.name.strip(),
        "description": req.description.strip() if req.description else "",
        "owner_id": user["id"],
        "members": [owner_member],
        "created_at": now
    }
    
    try:
        db.workspaces.insert_one(ws_doc)
        return helper_format_ws(ws_doc)
    except Exception as e:
        logger.error(f"Failed to create workspace: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create workspace: {str(e)}")

@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        cursor = db.workspaces.find({
            "$or": [
                {"owner_id": user["id"]},
                {"members.id": user["id"]}
            ]
        }).sort("created_at", -1)
        
        results = [helper_format_ws(doc) for doc in cursor]
        return results
    except Exception as e:
        logger.error(f"Failed to list workspaces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list workspaces: {str(e)}")

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    ws = db.workspaces.find_one({"id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    is_member = any(m["id"] == user["id"] for m in ws.get("members", []))
    if not is_member and ws["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You are not a member of this workspace")
        
    return helper_format_ws(ws)

@router.post("/{workspace_id}/members", response_model=WorkspaceResponse)
async def add_workspace_member(workspace_id: str, req: WorkspaceAddMember, user: dict = Depends(get_current_user)):
    db = get_db()
    ws = db.workspaces.find_one({"id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    is_member = any(m["id"] == user["id"] for m in ws.get("members", []))
    if not is_member and ws["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only workspace members can add users")
        
    target_email = req.email.strip().lower()
    
    # Verify target user exists in registered users collection (db.users)
    target_user = db.users.find_one({"email": target_email})
    if not target_user:
        raise HTTPException(
            status_code=404,
            detail=f"User with email '{target_email}' is not a registered user. Only valid registered app users can be added to workspaces."
        )
        
    # Check if user is already a member
    if any(m["email"].lower() == target_email for m in ws.get("members", [])):
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")
        
    new_member = {
        "id": target_user["id"],
        "email": target_user["email"],
        "name": target_user.get("name") or target_user["email"].split("@")[0],
        "role": "member"
    }
    
    db.workspaces.update_one(
        {"id": workspace_id},
        {"$push": {"members": new_member}}
    )
    
    updated_ws = db.workspaces.find_one({"id": workspace_id})
    return helper_format_ws(updated_ws)

@router.delete("/{workspace_id}/members/{member_id}")
async def remove_workspace_member(workspace_id: str, member_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    ws = db.workspaces.find_one({"id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if ws["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the workspace owner can remove members")
        
    if member_id == ws["owner_id"]:
        raise HTTPException(status_code=400, detail="Owner cannot be removed from workspace")
        
    db.workspaces.update_one(
        {"id": workspace_id},
        {"$pull": {"members": {"id": member_id}}}
    )
    return {"status": "success", "message": "Member removed from workspace successfully"}

@router.get("/{workspace_id}/messages", response_model=List[WorkspaceMessageResponse])
async def get_workspace_messages(workspace_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    ws = db.workspaces.find_one({"id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    is_member = any(m["id"] == user["id"] for m in ws.get("members", []))
    if not is_member and ws["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You are not a member of this workspace")
        
    cursor = db.workspace_messages.find({"workspace_id": workspace_id}).sort("timestamp", 1)
    messages = []
    for doc in cursor:
        dt = doc["timestamp"]
        dt_str = dt.isoformat() + "Z" if isinstance(dt, datetime) else str(dt)
        messages.append(
            WorkspaceMessageResponse(
                id=doc["id"],
                workspace_id=doc["workspace_id"],
                sender_id=doc["sender_id"],
                sender_name=doc["sender_name"],
                sender_email=doc["sender_email"],
                content=doc["content"],
                timestamp=dt_str,
                model_used=doc.get("model_used"),
                is_ai=doc.get("is_ai", False)
            )
        )
    return messages

@router.post("/{workspace_id}/messages", response_model=WorkspaceMessageResponse)
async def send_workspace_message(workspace_id: str, req: WorkspaceMessageCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    ws = db.workspaces.find_one({"id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    is_member = any(m["id"] == user["id"] for m in ws.get("members", []))
    if not is_member and ws["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You are not a member of this workspace")
        
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow()
    sender_name = user.get("name") or user["email"].split("@")[0]
    
    msg_doc = {
        "id": msg_id,
        "workspace_id": workspace_id,
        "sender_id": user["id"],
        "sender_name": sender_name,
        "sender_email": user["email"],
        "content": req.content,
        "timestamp": now,
        "model_used": None,
        "is_ai": False
    }
    db.workspace_messages.insert_one(msg_doc)
    
    # If user checked 'Ask AI' in workspace chat, generate AI response into workspace thread
    if req.ask_ai:
        ai_msg_id = str(uuid.uuid4())
        ai_now = datetime.utcnow()
        ai_model = req.model or "zydrakon-free"
        try:
            ai_reply, actual_model, _, _ = openrouter_client.call_openrouter(
                user_message=req.content,
                model_alias=ai_model,
                history=[],
                agent_system_prompt=f"You are Zydrakon AI responding in workspace '{ws['name']}' to user {sender_name}."
            )
        except Exception as err:
            ai_reply = f"[AI Service Note]: Unable to generate AI reply ({str(err)})"
            actual_model = ai_model
            
        ai_doc = {
            "id": ai_msg_id,
            "workspace_id": workspace_id,
            "sender_id": "zydrakon-ai-bot",
            "sender_name": "Zydrakon AI Bot",
            "sender_email": "ai@zydrakon.ai",
            "content": ai_reply,
            "timestamp": ai_now,
            "model_used": actual_model,
            "is_ai": True
        }
        db.workspace_messages.insert_one(ai_doc)
        
    return WorkspaceMessageResponse(
        id=msg_doc["id"],
        workspace_id=msg_doc["workspace_id"],
        sender_id=msg_doc["sender_id"],
        sender_name=msg_doc["sender_name"],
        sender_email=msg_doc["sender_email"],
        content=msg_doc["content"],
        timestamp=now.isoformat() + "Z",
        model_used=None,
        is_ai=False
    )
