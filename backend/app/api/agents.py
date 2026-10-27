from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.agent_execution import AgentExecution
from backend.app.agents.orchestrator import orchestrator

router = APIRouter(prefix="/agents", tags=["AI Agents"])


@router.get("/executions")
def list_agent_executions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    agent_name: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    task_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get agent execution telemetry logs with pagination and filtering."""
    query = db.query(AgentExecution)
    if agent_name:
        query = query.filter(AgentExecution.agent_name == agent_name)
    if status_filter:
        query = query.filter(AgentExecution.status == status_filter)
    if task_type:
        query = query.filter(AgentExecution.task_type == task_type)

    total = query.count()
    executions = query.order_by(desc(AgentExecution.created_at)).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return {
        "items": [
            {
                "id": str(e.id),
                "agent_name": e.agent_name,
                "agent_version": e.agent_version,
                "task_type": e.task_type,
                "record_id": e.record_id,
                "status": e.status,
                "start_time": e.start_time.isoformat() if e.start_time else None,
                "end_time": e.end_time.isoformat() if e.end_time else None,
                "duration_ms": e.duration_ms,
                "outcome_summary": e.outcome_summary,
                "error_category": e.error_category,
                "retry_count": e.retry_count,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in executions
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/executions/stats")
def agent_execution_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregate agent execution statistics."""
    from sqlalchemy import func

    total = db.query(func.count(AgentExecution.id)).scalar() or 0
    success = db.query(func.count(AgentExecution.id)).filter(
        AgentExecution.status == "SUCCESS"
    ).scalar() or 0
    failed = db.query(func.count(AgentExecution.id)).filter(
        AgentExecution.status == "FAILED"
    ).scalar() or 0
    avg_duration = db.query(func.avg(AgentExecution.duration_ms)).scalar() or 0

    # Per-agent breakdown
    agent_stats = db.query(
        AgentExecution.agent_name,
        func.count(AgentExecution.id).label("count"),
        func.avg(AgentExecution.duration_ms).label("avg_ms"),
    ).group_by(AgentExecution.agent_name).all()

    return {
        "total_executions": total,
        "successful": success,
        "failed": failed,
        "success_rate": round(success / total * 100, 1) if total > 0 else 0,
        "avg_duration_ms": round(float(avg_duration), 2),
        "by_agent": [
            {
                "agent_name": s[0],
                "count": s[1],
                "avg_duration_ms": round(float(s[2] or 0), 2),
            }
            for s in agent_stats
        ],
    }


@router.post("/run-pipeline/{transaction_id}")
def run_pipeline(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run the full multi-agent fraud investigation pipeline on a transaction."""
    result = orchestrator.run_full_pipeline(db=db, transaction_id=transaction_id)
    return result


@router.post("/triage-alerts")
def triage_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run alert prioritization and triage."""
    result = orchestrator.run_alert_triage(db=db, limit=limit)
    return result
