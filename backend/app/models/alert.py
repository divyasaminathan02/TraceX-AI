import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, GUID

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(GUID(), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_id = Column(GUID(), ForeignKey("fraud_predictions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    severity = Column(String(50), nullable=False, index=True) # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), default="NEW", nullable=False, index=True) # NEW, UNDER_INVESTIGATION, RESOLVED, DISMISSED
    assigned_to_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    resolved_by_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    transaction = relationship("Transaction", back_populates="alerts")
    prediction = relationship("FraudPrediction", back_populates="alert")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_alerts")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    cases = relationship("InvestigationCase", back_populates="alert")

    __table_args__ = (
        Index("ix_alerts_status_severity", "status", "severity"),
    )
