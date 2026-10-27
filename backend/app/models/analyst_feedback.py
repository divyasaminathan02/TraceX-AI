import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, GUID

class AnalystFeedback(Base):
    __tablename__ = "analyst_feedbacks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(GUID(), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    analyst_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    label = Column(String(50), nullable=False, index=True) # CONFIRMED_FRAUD, LEGITIMATE, NEEDS_FURTHER_REVIEW
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    transaction = relationship("Transaction")
    analyst = relationship("User")

    __table_args__ = (
        Index("ix_feedback_tx_label", "transaction_id", "label"),
    )
