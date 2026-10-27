from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.services.ml_service import ml_inference_service

router = APIRouter(tags=["Health & Diagnostics"])

@router.get("/health")
def health_check(response: Response, db: Session = Depends(get_db)):
    """Liveness and readiness probe for orchestration and uptime monitoring."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1;"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    ml_status = "operational" if ml_inference_service.is_available else "degraded (no model artifact loaded)"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
        "ml_inference_service": ml_status,
        "active_model_version": ml_inference_service.current_version
    }
