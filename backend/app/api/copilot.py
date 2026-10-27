from typing import Optional, List, Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.agents.copilot_agent import copilot_agent

router = APIRouter(prefix="/copilot", tags=["Investigation Copilot"])


class CopilotChatRequest(BaseModel):
    message: str
    transaction_id: Optional[str] = None
    session_history: Optional[List[Dict]] = []


class CopilotConfirmRequest(BaseModel):
    action: Dict


@router.post("/chat")
def copilot_chat(
    req: CopilotChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Interactive copilot chat endpoint for analyst investigation."""
    result = copilot_agent.run(
        db=db,
        record_id=req.transaction_id,
        message=req.message,
        session_history=req.session_history or [],
        analyst_id=str(current_user.id),
    )
    return {
        "response": result.data.get("response", ""),
        "tool_called": result.data.get("tool_called"),
        "tool_result": result.data.get("tool_result"),
        "requires_confirmation": result.data.get("requires_confirmation", False),
        "pending_action": result.data.get("pending_action"),
        "blocked": result.data.get("blocked", False),
        "agent_status": result.status,
        "duration_ms": result.duration_ms,
    }


@router.post("/confirm-action")
def copilot_confirm_action(
    req: CopilotConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm and execute a pending copilot write action."""
    result = copilot_agent.run(
        db=db,
        record_id=req.action.get("record_id"),
        confirmed_action=req.action,
        analyst_id=str(current_user.id),
    )
    return {
        "response": result.data.get("response", ""),
        "tool_called": result.data.get("tool_called"),
        "tool_result": result.data.get("tool_result"),
        "requires_confirmation": False,
        "agent_status": result.status,
        "duration_ms": result.duration_ms,
    }
