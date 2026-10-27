import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_admin
from backend.app.models.user import User
from backend.app.models.model_metadata import ModelMetadata
from backend.app.schemas.common import ModelInfoResponse
from backend.app.services.ml_service import ml_inference_service
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/models", tags=["ML Models"])

@router.get("", response_model=List[ModelInfoResponse])
def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    models = db.query(ModelMetadata).order_by(desc(ModelMetadata.created_at)).all()
    return models

@router.get("/active", response_model=ModelInfoResponse)
def get_active_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    model = db.query(ModelMetadata).filter(ModelMetadata.is_active == True).first()
    if not model:
        raise HTTPException(status_code=404, detail="No active machine learning model found in registry.")
    return model

@router.post("/{model_id}/activate", response_model=ModelInfoResponse)
def activate_model(
    model_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    target = db.query(ModelMetadata).filter(ModelMetadata.id == model_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Model metadata record not found")

    # Set all others inactive
    db.query(ModelMetadata).update({"is_active": False})
    target.is_active = True
    db.commit()
    db.refresh(target)

    # Reload inference engine with newly activated version
    ml_inference_service.reload_model()

    log_audit_event(
        db=db,
        action="MODEL_ACTIVATED",
        entity_type="ModelMetadata",
        entity_id=str(target.id),
        user=current_user,
        details={"version": target.version, "algorithm": target.algorithm}
    )

    return target
