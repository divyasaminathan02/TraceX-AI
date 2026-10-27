import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, JSON, Text
from backend.app.core.database import Base, GUID

class ModelMetadata(Base):
    __tablename__ = "model_metadata"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    version = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    algorithm = Column(String(100), nullable=False)
    hyperparameters = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=False) # precision, recall, f1, roc_auc, pr_auc, confusion_matrix, etc.
    feature_names = Column(JSON, nullable=False)
    training_dataset_size = Column(Integer, default=0)
    fraud_count_in_training = Column(Integer, default=0)
    is_active = Column(Boolean, default=False, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
