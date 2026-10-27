import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.prediction import FraudPrediction
from backend.app.schemas.common import TransactionCreate, PredictionResponse
from backend.app.services.ml_service import ml_inference_service

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.post("/simulate")
def simulate_prediction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user)
):
    """
    On-demand What-If fraud prediction simulation without mutating transaction ledgers.
    """
    result = ml_inference_service.predict_single(payload.dict())
    return result

@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction_by_id(
    prediction_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pred = db.query(FraudPrediction).filter(FraudPrediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return pred
