import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_analyst_or_admin
from backend.app.models.user import User
from backend.app.models.alert import Alert
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.schemas.common import AlertResponse, AlertUpdateStatus, PaginatedResponse
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=PaginatedResponse[AlertResponse])
def get_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    assigned_to_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert).options(
        joinedload(Alert.transaction).joinedload(Transaction.prediction),
        joinedload(Alert.assigned_to)
    )

    if status_filter:
        query = query.filter(Alert.status == status_filter.upper())
    
    if severity:
        query = query.filter(Alert.severity == severity.upper())

    if assigned_to_id:
        query = query.filter(Alert.assigned_to_id == assigned_to_id)

    total = query.count()
    alerts = query.order_by(desc(Alert.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    # Map assigned_to_name
    items = []
    for a in alerts:
        res = AlertResponse(
            id=a.id,
            transaction_id=a.transaction_id,
            prediction_id=a.prediction_id,
            severity=a.severity,
            status=a.status,
            assigned_to_id=a.assigned_to_id,
            assigned_to_name=a.assigned_to.full_name if a.assigned_to else None,
            resolved_by_id=a.resolved_by_id,
            resolution_notes=a.resolution_notes,
            created_at=a.created_at,
            updated_at=a.updated_at,
            transaction=a.transaction,
            prediction=a.prediction
        )
        items.append(res)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_detail(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    a = db.query(Alert).options(
        joinedload(Alert.transaction).joinedload(Transaction.prediction),
        joinedload(Alert.assigned_to)
    ).filter(Alert.id == alert_id).first()

    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")

    return AlertResponse(
        id=a.id,
        transaction_id=a.transaction_id,
        prediction_id=a.prediction_id,
        severity=a.severity,
        status=a.status,
        assigned_to_id=a.assigned_to_id,
        assigned_to_name=a.assigned_to.full_name if a.assigned_to else None,
        resolved_by_id=a.resolved_by_id,
        resolution_notes=a.resolution_notes,
        created_at=a.created_at,
        updated_at=a.updated_at,
        transaction=a.transaction,
        prediction=a.prediction
    )

@router.patch("/{alert_id}/status", response_model=AlertResponse)
def update_alert_status(
    alert_id: uuid.UUID,
    payload: AlertUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_admin)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    old_status = alert.status
    alert.status = payload.status.upper()
    
    if payload.resolution_notes:
        alert.resolution_notes = payload.resolution_notes

    if payload.assigned_to_id is not None:
        alert.assigned_to_id = payload.assigned_to_id

    if alert.status in ["RESOLVED", "DISMISSED"]:
        alert.resolved_by_id = current_user.id

    db.commit()
    db.refresh(alert)

    log_audit_event(
        db=db,
        action="ALERT_STATUS_UPDATED",
        entity_type="Alert",
        entity_id=str(alert.id),
        user=current_user,
        details={
            "old_status": old_status,
            "new_status": alert.status,
            "notes": payload.resolution_notes
        }
    )

    return get_alert_detail(alert_id=alert.id, db=db, current_user=current_user)
