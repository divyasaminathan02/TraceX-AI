from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import require_admin
from backend.app.models.user import User
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.common import AuditLogResponse, PaginatedResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=PaginatedResponse[AuditLogResponse])
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type.ilike(f"%{entity_type}%"))

    total = query.count()
    items = query.order_by(desc(AuditLog.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
