from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.models.alert import Alert
from backend.app.models.case import InvestigationCase
from backend.app.schemas.common import (
    DashboardStatsResponse, TransactionResponse, AlertResponse
)
from backend.app.services.ml_service import ml_inference_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Core aggregate metrics from PostgreSQL
    total_tx = db.query(func.count(Transaction.id)).scalar() or 0
    flagged_tx = db.query(func.count(Transaction.id)).filter(Transaction.is_flagged_fraud_actual == 1).scalar() or 0
    
    total_alerts = db.query(func.count(Alert.id)).scalar() or 0
    active_alerts = db.query(func.count(Alert.id)).filter(Alert.status.in_(["NEW", "UNDER_INVESTIGATION"])).scalar() or 0
    
    confirmed_fraud_cases = db.query(func.count(InvestigationCase.id)).filter(
        InvestigationCase.status == "CLOSED_FRAUD"
    ).scalar() or 0
    
    open_cases = db.query(func.count(InvestigationCase.id)).filter(
        InvestigationCase.status.in_(["OPEN", "IN_PROGRESS"])
    ).scalar() or 0

    # Predicted frauds count
    predicted_frauds = db.query(func.count(FraudPrediction.id)).filter(
        FraudPrediction.is_predicted_fraud == True
    ).scalar() or 0

    fraud_rate = (predicted_frauds / total_tx * 100.0) if total_tx > 0 else 0.0

    # 2. Risk Distribution
    risk_counts = db.query(
        FraudPrediction.risk_level,
        func.count(FraudPrediction.id)
    ).group_by(FraudPrediction.risk_level).all()
    
    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for r_level, count in risk_counts:
        if r_level in risk_dist:
            risk_dist[r_level] = count

    # 3. Transaction Type Distribution
    type_counts = db.query(
        Transaction.type,
        func.count(Transaction.id)
    ).group_by(Transaction.type).all()
    type_dist = {t: c for t, c in type_counts}

    # 4. Volume by Day / Temporal sequence
    # SQLite-compatible aggregation: use the date portion of the timestamp instead of PostgreSQL's date_trunc().
    volume_by_day: List[Dict[str, Any]] = []
    daily_stats = db.query(
        func.date(Transaction.created_at).label("day"),
        func.count(Transaction.id).label("total"),
        func.sum(Transaction.amount).label("volume")
    ).group_by(func.date(Transaction.created_at)).order_by(func.date(Transaction.created_at)).limit(14).all()

    for row in daily_stats:
        day_str = row.day.strftime("%b %d") if hasattr(row.day, "strftime") else str(row.day)
        volume_by_day.append({
            "date": day_str,
            "transactions": int(row.total or 0),
            "volume": float(row.volume or 0.0)
        })

    # If no dates available yet, supply empty array (charts render clean empty state)
    
    # 5. Recent 5 Transactions
    recent_txs = db.query(Transaction).options(
        joinedload(Transaction.prediction)
    ).order_by(desc(Transaction.created_at)).limit(5).all()

    # 6. Recent 5 Alerts
    recent_alerts_raw = db.query(Alert).options(
        joinedload(Alert.transaction).joinedload(Transaction.prediction),
        joinedload(Alert.assigned_to)
    ).order_by(desc(Alert.created_at)).limit(5).all()

    recent_alerts = [
        AlertResponse(
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
        ) for a in recent_alerts_raw
    ]

    model_status = "OPERATIONAL" if ml_inference_service.is_available else "NOT_LOADED"

    return DashboardStatsResponse(
        total_transactions=total_tx,
        flagged_transactions=flagged_tx,
        fraud_rate_percentage=round(fraud_rate, 2),
        total_alerts=total_alerts,
        active_alerts=active_alerts,
        confirmed_fraud_cases=confirmed_fraud_cases,
        open_cases=open_cases,
        model_version=ml_inference_service.current_version,
        model_status=model_status,
        volume_by_day=volume_by_day,
        risk_distribution=risk_dist,
        type_distribution=type_dist,
        recent_transactions=recent_txs,
        recent_alerts=recent_alerts
    )
