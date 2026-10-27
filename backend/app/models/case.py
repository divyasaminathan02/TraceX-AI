import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, GUID

class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(50), default="MEDIUM", nullable=False, index=True) # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(50), default="OPEN", nullable=False, index=True) # OPEN, IN_PROGRESS, CLOSED_FRAUD, CLOSED_FALSE_POSITIVE
    
    transaction_id = Column(GUID(), ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True, index=True)
    alert_id = Column(GUID(), ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Automated Evidence and Next-Steps (from AI Investigation Service)
    ai_investigation_summary = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    transaction = relationship("Transaction", back_populates="cases")
    alert = relationship("Alert", back_populates="cases")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_cases")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_cases")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan", order_by="CaseNote.created_at.desc()")
    status_history = relationship("CaseStatusHistory", back_populates="case", cascade="all, delete-orphan", order_by="CaseStatusHistory.created_at.desc()")

    __table_args__ = (
        Index("ix_cases_status_priority", "status", "priority"),
    )

class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    case_id = Column(GUID(), ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    evidence_data = Column(JSON, nullable=True) # Supporting evidence or payload
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    case = relationship("InvestigationCase", back_populates="notes")
    author = relationship("User", back_populates="case_notes")

class CaseStatusHistory(Base):
    __tablename__ = "case_status_history"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    case_id = Column(GUID(), ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    case = relationship("InvestigationCase", back_populates="status_history")
    changed_by = relationship("User")
