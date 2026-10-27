import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.core.bootstrap import init_db_bootstrap
from backend.app.services.ml_service import ml_inference_service

# Import all model modules so SQLAlchemy metadata is populated before schema creation.
from backend.app.models import *  # noqa: F401,F403

from backend.app.api.auth import router as auth_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.transactions import router as transactions_router
from backend.app.api.predictions import router as predictions_router
from backend.app.api.imports import router as imports_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.cases import router as cases_router
from backend.app.api.models import router as models_router
from backend.app.api.users import router as users_router
from backend.app.api.audit import router as audit_router
from backend.app.api.notifications import router as notifications_router
from backend.app.api.health import router as health_router
from backend.app.api.agents import router as agents_router
from backend.app.api.copilot import router as copilot_router
from backend.app.api.feedback import router as feedback_router
from backend.app.api.reports import router as reports_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("tracex.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run bootstrap and ensure ML model is loaded
    logger.info("Initializing %s v%s...", settings.APP_NAME, settings.APP_VERSION)
    try:
        Base.metadata.create_all(bind=engine)
        init_db_bootstrap()
        ml_inference_service.reload_model()
        logger.info("Bootstrap complete. ML status: %s", "Loaded" if ml_inference_service.is_available else "Not loaded")
    except Exception as e:
        logger.error("Startup initialization warning: %s", e)
    yield
    # Shutdown
    logger.info("Shutting down %s...", settings.APP_NAME)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise AI-Powered Financial Transaction Fraud Detection & Risk Intelligence Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception at %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact security operations."}
    )

# Include API Routers under /api/v1
api_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)
app.include_router(transactions_router, prefix=api_prefix)
app.include_router(predictions_router, prefix=api_prefix)
app.include_router(imports_router, prefix=api_prefix)
app.include_router(alerts_router, prefix=api_prefix)
app.include_router(cases_router, prefix=api_prefix)
app.include_router(models_router, prefix=api_prefix)
app.include_router(users_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(notifications_router, prefix=api_prefix)
app.include_router(health_router, prefix=api_prefix)
app.include_router(agents_router, prefix=api_prefix)
app.include_router(copilot_router, prefix=api_prefix)
app.include_router(feedback_router, prefix=api_prefix)
app.include_router(reports_router, prefix=api_prefix)

@app.get("/")
def root():
    return {
        "platform": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs"
    }
