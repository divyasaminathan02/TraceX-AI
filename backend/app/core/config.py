import os
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "TraceX AI Fraud Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # PostgreSQL Database URL
    DATABASE_URL: str = "postgresql+psycopg2://postgres@localhost:5432/tracex"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # JWT Authentication
    SECRET_KEY: str = "tracex_enterprise_jwt_super_secret_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Initial Admin Bootstrap
    INITIAL_ADMIN_EMAIL: str = "admin@tracex.ai"
    INITIAL_ADMIN_PASSWORD: str = "AdminSecurePass123!"
    INITIAL_ADMIN_NAME: str = "Security Operations Admin"

    # Risk Thresholds
    RISK_THRESHOLD_LOW: float = 0.30
    RISK_THRESHOLD_MEDIUM: float = 0.65
    RISK_THRESHOLD_HIGH: float = 0.85

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    # ML
    ML_MODEL_DIR: str = "ml/models"

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
