import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, GUID

class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    total_records = Column(Integer, default=0)
    processed_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    status = Column(String(50), default="PROCESSING", index=True) # PENDING, PROCESSING, COMPLETED, FAILED
    error_summary = Column(JSON, nullable=True) # List of row-level errors
    created_by_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    created_by = relationship("User", back_populates="import_batches")
    transactions = relationship("Transaction", back_populates="import_batch")
