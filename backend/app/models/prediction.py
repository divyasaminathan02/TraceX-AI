import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, GUID

class FraudPrediction(Base):
    __tablename__ = "fraud_predictions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(GUID(), ForeignKey("transactions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    fraud_probability = Column(Float, nullable=False)
    risk_level = Column(String(50), nullable=False, index=True) # LOW, MEDIUM, HIGH, CRITICAL
    is_predicted_fraud = Column(Boolean, nullable=False, index=True)
    model_version = Column(String(50), nullable=False, index=True)
    model_name = Column(String(100), nullable=False)
    explanation = Column(JSON, nullable=True) # Key contributing factors, feature importances, behavioral triggers
    prediction_notice = Column(String(255), default="Automated statistical risk score. Not definitive proof of fraudulent intent.", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    transaction = relationship("Transaction", back_populates="prediction")
    alert = relationship("Alert", back_populates="prediction", uselist=False, cascade="all, delete-orphan")
