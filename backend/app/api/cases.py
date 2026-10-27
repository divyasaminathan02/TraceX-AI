import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_analyst_or_admin
from backend.app.models.user import User
from backend.app.models.case import InvestigationCase, CaseNote, CaseStatusHistory
from backend.app.models.transaction import Transaction
from backend.app.models.alert import Alert
from backend.app.schemas.common import (
    CaseCreate, CaseUpdate, CaseNoteCreate, CaseResponse, CaseNoteResponse,
    CaseStatusHistoryResponse, PaginatedResponse
)
from backend.app.services.ai_investigation_service import ai_investigation_service
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/cases", tags=["Investigation Cases"])

def serialize_case(c: InvestigationCase) -> CaseResponse:
    return CaseResponse(
        id=c.id,
        case_number=c.case_number,
        title=c.title,
        description=c.description,
        priority=c.priority,
        status=c.status,
        transaction_id=c.transaction_id,
        alert_id=c.alert_id,
        assigned_to_id=c.assigned_to_id,
        assigned_to_name=c.assigned_to.full_name if c.assigned_to else None,
        created_by_id=c.created_by_id,
        created_by_name=c.created_by.full_name if c.created_by else None,
        ai_investigation_summary=c.ai_investigation_summary,
        created_at=c.created_at,
        updated_at=c.updated_at,
        notes=[
            CaseNoteResponse(
                id=n.id,
                case_id=n.case_id,
                author_id=n.author_id,
                author_name=n.author.full_name if n.author else None,
                content=n.content,
                evidence_data=n.evidence_data,
                created_at=n.created_at
            ) for n in c.notes
        ],
        status_history=[
            CaseStatusHistoryResponse(
                id=h.id,
                case_id=h.case_id,
                changed_by_name=h.changed_by.full_name if h.changed_by else None,
                old_status=h.old_status,
                new_status=h.new_status,
                comment=h.comment,
                created_at=h.created_at
            ) for h in c.status_history
        ],
        transaction=c.transaction
    )

@router.get("", response_model=PaginatedResponse[CaseResponse])
def get_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    assigned_to_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InvestigationCase).options(
        joinedload(InvestigationCase.assigned_to),
        joinedload(InvestigationCase.created_by),
        joinedload(InvestigationCase.transaction).joinedload(Transaction.prediction),
        joinedload(InvestigationCase.notes).joinedload(CaseNote.author),
        joinedload(InvestigationCase.status_history).joinedload(CaseStatusHistory.changed_by)
    )

    if status_filter:
        query = query.filter(InvestigationCase.status == status_filter.upper())

    if priority:
        query = query.filter(InvestigationCase.priority == priority.upper())

    if assigned_to_id:
        query = query.filter(InvestigationCase.assigned_to_id == assigned_to_id)

    total = query.count()
    cases = query.order_by(desc(InvestigationCase.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    items = [serialize_case(c) for c in cases]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_admin)
):
    case_count = db.query(InvestigationCase).count() + 1
    case_num = f"CASE-{datetime_year()}-{case_count:04d}"

    # Generate initial AI Evidence Brief if transaction is attached
    ai_summary = None
    if payload.transaction_id:
        tx = db.query(Transaction).options(joinedload(Transaction.prediction)).filter(Transaction.id == payload.transaction_id).first()
        if tx:
            ai_summary = ai_investigation_service.generate_case_brief(transaction=tx)

    new_case = InvestigationCase(
        case_number=case_num,
        title=payload.title,
        description=payload.description,
        priority=payload.priority.upper(),
        status="OPEN",
        transaction_id=payload.transaction_id,
        alert_id=payload.alert_id,
        assigned_to_id=payload.assigned_to_id or current_user.id,
        created_by_id=current_user.id,
        ai_investigation_summary=ai_summary
    )
    db.add(new_case)
    db.flush()

    # Initial history entry
    hist = CaseStatusHistory(
        case_id=new_case.id,
        changed_by_id=current_user.id,
        old_status="NONE",
        new_status="OPEN",
        comment="Case initiated."
    )
    db.add(hist)

    # If alert is attached, update alert status to UNDER_INVESTIGATION
    if payload.alert_id:
        alert = db.query(Alert).filter(Alert.id == payload.alert_id).first()
        if alert:
            alert.status = "UNDER_INVESTIGATION"

    db.commit()
    db.refresh(new_case)

    log_audit_event(
        db=db,
        action="CASE_CREATED",
        entity_type="InvestigationCase",
        entity_id=str(new_case.id),
        user=current_user,
        details={"case_number": case_num, "title": new_case.title, "priority": new_case.priority}
    )

    return get_case_detail(case_id=new_case.id, db=db, current_user=current_user)

@router.get("/{case_id}", response_model=CaseResponse)
def get_case_detail(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(InvestigationCase).options(
        joinedload(InvestigationCase.assigned_to),
        joinedload(InvestigationCase.created_by),
        joinedload(InvestigationCase.transaction).joinedload(Transaction.prediction),
        joinedload(InvestigationCase.notes).joinedload(CaseNote.author),
        joinedload(InvestigationCase.status_history).joinedload(CaseStatusHistory.changed_by)
    ).filter(InvestigationCase.id == case_id).first()

    if not c:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    return serialize_case(c)

@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: uuid.UUID,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_admin)
):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if payload.status and payload.status.upper() != case.status:
        old_status = case.status
        new_status = payload.status.upper()
        case.status = new_status
        
        hist = CaseStatusHistory(
            case_id=case.id,
            changed_by_id=current_user.id,
            old_status=old_status,
            new_status=new_status,
            comment=payload.comment or f"Status changed to {new_status}"
        )
        db.add(hist)

    if payload.priority:
        case.priority = payload.priority.upper()

    if payload.assigned_to_id is not None:
        case.assigned_to_id = payload.assigned_to_id

    if payload.title:
        case.title = payload.title

    if payload.description:
        case.description = payload.description

    db.commit()
    db.refresh(case)

    log_audit_event(
        db=db,
        action="CASE_UPDATED",
        entity_type="InvestigationCase",
        entity_id=str(case.id),
        user=current_user,
        details={"status": case.status, "priority": case.priority}
    )

    return get_case_detail(case_id=case.id, db=db, current_user=current_user)

@router.post("/{case_id}/notes", response_model=CaseNoteResponse, status_code=status.HTTP_201_CREATED)
def add_case_note(
    case_id: uuid.UUID,
    payload: CaseNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_admin)
):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    note = CaseNote(
        case_id=case.id,
        author_id=current_user.id,
        content=payload.content,
        evidence_data=payload.evidence_data
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_audit_event(
        db=db,
        action="CASE_NOTE_ADDED",
        entity_type="CaseNote",
        entity_id=str(note.id),
        user=current_user,
        details={"case_id": str(case.id)}
    )

    return CaseNoteResponse(
        id=note.id,
        case_id=note.case_id,
        author_id=note.author_id,
        author_name=current_user.full_name,
        content=note.content,
        evidence_data=note.evidence_data,
        created_at=note.created_at
    )

@router.post("/{case_id}/generate-ai-brief", response_model=CaseResponse)
def trigger_ai_case_brief(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_admin)
):
    case = db.query(InvestigationCase).options(
        joinedload(InvestigationCase.transaction).joinedload(Transaction.prediction)
    ).filter(InvestigationCase.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not case.transaction:
        raise HTTPException(status_code=400, detail="Cannot generate AI brief without an associated transaction.")

    summary = ai_investigation_service.generate_case_brief(transaction=case.transaction)
    case.ai_investigation_summary = summary
    db.commit()

    return get_case_detail(case_id=case.id, db=db, current_user=current_user)

def datetime_year() -> int:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).year
