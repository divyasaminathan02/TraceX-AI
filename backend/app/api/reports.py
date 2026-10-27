import csv
import io
import json
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.models.case import InvestigationCase

router = APIRouter(prefix="/reports", tags=["Reports & Export"])


@router.get("/export/transactions")
def export_transactions(
    format: str = Query("csv", regex="^(csv|json)$"),
    tx_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export filtered transactions as CSV or JSON."""
    query = db.query(Transaction)
    if tx_type:
        query = query.filter(Transaction.type == tx_type)
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)

    transactions = query.order_by(desc(Transaction.created_at)).limit(limit).all()

    # Enrich with predictions
    rows = []
    for tx in transactions:
        pred = db.query(FraudPrediction).filter(
            FraudPrediction.transaction_id == tx.id
        ).first()

        row = {
            "id": str(tx.id),
            "transaction_ref": tx.transaction_ref,
            "type": tx.type,
            "amount": tx.amount,
            "name_orig": tx.name_orig,
            "oldbalance_org": tx.oldbalance_org,
            "newbalance_orig": tx.newbalance_orig,
            "name_dest": tx.name_dest,
            "oldbalance_dest": tx.oldbalance_dest,
            "newbalance_dest": tx.newbalance_dest,
            "step": tx.step,
            "fraud_probability": pred.fraud_probability if pred else None,
            "risk_level": pred.risk_level if pred else None,
            "is_predicted_fraud": pred.is_predicted_fraud if pred else None,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        }

        # Apply risk_level filter if specified (post-join)
        if risk_level and pred and pred.risk_level != risk_level:
            continue
        if risk_level and not pred:
            continue

        rows.append(row)

    if format == "json":
        return StreamingResponse(
            io.BytesIO(json.dumps(rows, indent=2, default=str).encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=tracex_transactions_export.json"}
        )

    # CSV format
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    content = output.getvalue().encode("utf-8")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tracex_transactions_export.csv"}
    )


@router.get("/export/cases")
def export_cases(
    format: str = Query("csv", regex="^(csv|json)$"),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    limit: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export filtered investigation cases as CSV or JSON."""
    query = db.query(InvestigationCase)
    if status_filter:
        query = query.filter(InvestigationCase.status == status_filter)
    if priority:
        query = query.filter(InvestigationCase.priority == priority)

    cases = query.order_by(desc(InvestigationCase.created_at)).limit(limit).all()

    rows = []
    for c in cases:
        rows.append({
            "id": str(c.id),
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "priority": c.priority,
            "transaction_id": str(c.transaction_id) if c.transaction_id else None,
            "assigned_to_id": str(c.assigned_to_id) if c.assigned_to_id else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        })

    if format == "json":
        return StreamingResponse(
            io.BytesIO(json.dumps(rows, indent=2, default=str).encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=tracex_cases_export.json"}
        )

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    content = output.getvalue().encode("utf-8")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tracex_cases_export.csv"}
    )
