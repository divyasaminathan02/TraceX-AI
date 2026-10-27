import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_analyst_or_admin
from backend.app.models.user import User
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.models.alert import Alert
from backend.app.schemas.common import (
    TransactionCreate, TransactionResponse, PaginatedResponse
)
from backend.app.services.ml_service import ml_inference_service
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=PaginatedResponse[TransactionResponse])
def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    tx_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transaction).options(joinedload(Transaction.prediction))

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.transaction_ref.ilike(search_filter),
                Transaction.name_orig.ilike(search_filter),
                Transaction.name_dest.ilike(search_filter)
            )
        )
    
    if tx_type:
        query = query.filter(Transaction.type == tx_type.upper())

    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)

    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)

    if risk_level:
        query = query.join(Transaction.prediction).filter(FraudPrediction.risk_level == risk_level.upper())

    total = query.count()
    items = query.order_by(desc(Transaction.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{tx_id}", response_model=TransactionResponse)
def get_transaction_detail(
    tx_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = db.query(Transaction).options(joinedload(Transaction.prediction)).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction_and_predict(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_admin)
):
    """
    Submits a new financial transaction, executes live ML inference,
    stores predictions in PostgreSQL, and generates alerts if risk threshold is breached.
    """
    ref = payload.transaction_ref or f"TX-{uuid.uuid4().hex[:12].upper()}"

    new_tx = Transaction(
        transaction_ref=ref,
        step=payload.step,
        type=payload.type.upper(),
        amount=payload.amount,
        name_orig=payload.name_orig,
        oldbalance_org=payload.oldbalance_org,
        newbalance_orig=payload.newbalance_orig,
        name_dest=payload.name_dest,
        oldbalance_dest=payload.oldbalance_dest,
        newbalance_dest=payload.newbalance_dest,
        is_fraud_actual=0,
        is_flagged_fraud_actual=1 if payload.amount > 200000 else 0
    )
    db.add(new_tx)
    db.flush()

    # Execute ML Inference
    prediction_result = ml_inference_service.predict_single(payload.dict())

    prediction = FraudPrediction(
        transaction_id=new_tx.id,
        fraud_probability=prediction_result["fraud_probability"],
        risk_level=prediction_result["risk_level"],
        is_predicted_fraud=prediction_result["is_predicted_fraud"],
        model_version=prediction_result["model_version"],
        model_name=prediction_result["model_name"],
        explanation=prediction_result["explanation"],
        prediction_notice=prediction_result["prediction_notice"]
    )
    db.add(prediction)
    db.flush()

    # Automatically create Alert for Medium, High, and Critical Risk transactions
    if prediction.risk_level in ["MEDIUM", "HIGH", "CRITICAL"]:
        alert = Alert(
            transaction_id=new_tx.id,
            prediction_id=prediction.id,
            severity=prediction.risk_level,
            status="NEW"
        )
        db.add(alert)

    db.commit()
    db.refresh(new_tx)

    log_audit_event(
        db=db,
        action="TRANSACTION_ANALYZED",
        entity_type="Transaction",
        entity_id=str(new_tx.id),
        user=current_user,
        details={
            "ref": ref,
            "type": new_tx.type,
            "amount": new_tx.amount,
            "risk_level": prediction.risk_level,
            "prob": prediction.fraud_probability
        }
    )

    return new_tx
