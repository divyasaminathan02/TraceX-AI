import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey, Text, Float, Integer, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, GUID

def generate_uuid():
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"

class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.VIEWER.value, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    assigned_alerts = relationship("Alert", back_populates="assigned_to", foreign_keys="Alert.assigned_to_id")
    assigned_cases = relationship("InvestigationCase", back_populates="assigned_to", foreign_keys="InvestigationCase.assigned_to_id")
    created_cases = relationship("InvestigationCase", back_populates="created_by", foreign_keys="InvestigationCase.created_by_id")
    case_notes = relationship("CaseNote", back_populates="author")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    import_batches = relationship("ImportBatch", back_populates="created_by")
