import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON, Index
from backend.app.core.database import Base, GUID

class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    agent_name = Column(String(100), nullable=False, index=True)
    agent_version = Column(String(50), nullable=False, default="1.0.0")
    task_type = Column(String(100), nullable=False, index=True)
    record_id = Column(String(100), nullable=True, index=True) # Linked Transaction or Alert ID
    status = Column(String(50), nullable=False, index=True) # SUCCESS, FAILED, RETRYING, TIMED_OUT
    start_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Float, nullable=True)
    outcome_summary = Column(Text, nullable=True)
    details = Column(JSON, nullable=True) # Sanitized inputs & outcomes
    error_category = Column(String(100), nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    __table_args__ = (
        Index("ix_agent_exec_name_status", "agent_name", "status"),
        Index("ix_agent_exec_created_status", "created_at", "status"),
    )
