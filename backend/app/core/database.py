import os
import uuid
from pathlib import Path

from sqlalchemy import create_engine, text, TypeDecorator, String
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.app.core.config import settings


class GUID(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def python_type(self):
        return str


def _resolve_database_url() -> str:
    configured_url = os.getenv("DATABASE_URL") or settings.DATABASE_URL
    if configured_url.startswith("sqlite"):
        return configured_url

    candidate = configured_url
    if candidate.startswith("postgresql://"):
        candidate = candidate.replace("postgresql://", "postgresql+psycopg2://", 1)

    try:
        probe_engine = create_engine(candidate, pool_pre_ping=True, echo=False)
        with probe_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        probe_engine.dispose()
        return candidate
    except Exception:
        sqlite_path = (Path(__file__).resolve().parents[3] / "tracex.db")
        return f"sqlite:///{sqlite_path.as_posix()}"


DATABASE_URL = _resolve_database_url()

engine_kwargs = {
    "pool_pre_ping": True,
    "echo": False,
}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = settings.DB_POOL_SIZE
    engine_kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
