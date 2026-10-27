from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.analyst_feedback import AnalystFeedback
from backend.app.models.transaction import Transaction

router = APIRouter(prefix="/feedback", tags=["Analyst Feedback"])


class FeedbackCreate(BaseModel):
    transaction_id: str
    label: str  # CONFIRMED_FRAUD, LEGITIMATE, NEEDS_FURTHER_REVIEW
    notes: Optional[str] = None


class FeedbackUpdate(BaseModel):
    label: Optional[str] = None
    notes: Optional[str] = None


VALID_LABELS = {"CONFIRMED_FRAUD", "LEGITIMATE", "NEEDS_FURTHER_REVIEW"}


@router.post("")
def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit analyst feedback/label for a transaction."""
    if data.label not in VALID_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid label. Must be one of: {', '.join(VALID_LABELS)}"
        )

    # Verify transaction exists
    tx = db.query(Transaction).filter(Transaction.id == data.transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Check for existing feedback by this analyst
    existing = db.query(AnalystFeedback).filter(
        AnalystFeedback.transaction_id == data.transaction_id,
        AnalystFeedback.analyst_id == current_user.id,
    ).first()

    if existing:
        existing.label = data.label
        existing.notes = data.notes
        db.commit()
        db.refresh(existing)
        feedback = existing
    else:
        feedback = AnalystFeedback(
            transaction_id=data.transaction_id,
            analyst_id=current_user.id,
            label=data.label,
            notes=data.notes,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)

    return {
        "id": str(feedback.id),
        "transaction_id": str(feedback.transaction_id),
        "analyst_id": str(feedback.analyst_id),
        "label": feedback.label,
        "notes": feedback.notes,
        "created_at": feedback.created_at.isoformat() if feedback.created_at else None,
        "updated_at": feedback.updated_at.isoformat() if feedback.updated_at else None,
    }


@router.get("")
def list_feedbacks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    label: Optional[str] = None,
    transaction_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List analyst feedback entries with pagination."""
    query = db.query(AnalystFeedback)
    if label:
        query = query.filter(AnalystFeedback.label == label)
    if transaction_id:
        query = query.filter(AnalystFeedback.transaction_id == transaction_id)

    total = query.count()
    items = query.order_by(desc(AnalystFeedback.created_at)).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return {
        "items": [
            {
                "id": str(f.id),
                "transaction_id": str(f.transaction_id),
                "analyst_id": str(f.analyst_id) if f.analyst_id else None,
                "label": f.label,
                "notes": f.notes,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            }
            for f in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/{transaction_id}")
def get_feedback_for_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all feedback for a specific transaction."""
    feedbacks = db.query(AnalystFeedback).filter(
        AnalystFeedback.transaction_id == transaction_id
    ).order_by(desc(AnalystFeedback.created_at)).all()

    return [
        {
            "id": str(f.id),
            "transaction_id": str(f.transaction_id),
            "analyst_id": str(f.analyst_id) if f.analyst_id else None,
            "label": f.label,
            "notes": f.notes,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in feedbacks
    ]
