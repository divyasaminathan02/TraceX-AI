import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, GUID

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    transaction_ref = Column(String(100), unique=True, index=True, nullable=False)
    step = Column(Integer, nullable=False, default=1, index=True) # Hour of simulation (1-744)
    type = Column(String(50), nullable=False, index=True) # PAYMENT, TRANSFER, CASH_OUT, DEBIT, CASH_IN
    amount = Column(Float, nullable=False)
    name_orig = Column(String(100), nullable=False, index=True)
    oldbalance_org = Column(Float, nullable=False)
    newbalance_orig = Column(Float, nullable=False)
    name_dest = Column(String(100), nullable=False, index=True)
    oldbalance_dest = Column(Float, nullable=False)
    newbalance_dest = Column(Float, nullable=False)
    is_fraud_actual = Column(Integer, nullable=True, default=0) # Known ground truth if synthetic dataset/benchmarked
    is_flagged_fraud_actual = Column(Integer, nullable=True, default=0)
    
    import_batch_id = Column(GUID(), ForeignKey("import_batches.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    import_batch = relationship("ImportBatch", back_populates="transactions")
    prediction = relationship("FraudPrediction", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="transaction", cascade="all, delete-orphan")
    cases = relationship("InvestigationCase", back_populates="transaction")

    __table_args__ = (
        Index("ix_transactions_type_amount", "type", "amount"),
        Index("ix_transactions_orig_dest", "name_orig", "name_dest"),
    )
