import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.models.agent_execution import AgentExecution

class AgentResult(BaseModel):
    agent_name: str
    agent_version: str
    task_type: str
    record_id: Optional[str] = None
    status: str # SUCCESS, FAILED, TIMED_OUT
    duration_ms: float
    outcome_summary: str
    data: Dict[str, Any]
    error: Optional[str] = None

class BaseAgent(ABC):
    def __init__(self, name: str, version: str, task_type: str):
        self.name = name
        self.version = version
        self.task_type = task_type

    @abstractmethod
    def _execute(self, db: Session, record_id: Optional[str], **kwargs) -> Dict[str, Any]:
        """Core business logic executed by the specific agent."""
        pass

    def run(self, db: Session, record_id: Optional[str] = None, **kwargs) -> AgentResult:
        start_time = datetime.now(timezone.utc)
        t0 = time.perf_counter()
        status = "SUCCESS"
        error_msg = None
        error_category = None
        outcome_summary = ""
        output_data: Dict[str, Any] = {}

        try:
            output_data = self._execute(db=db, record_id=record_id, **kwargs)
            outcome_summary = output_data.get("summary", f"{self.name} completed successfully.")
        except Exception as e:
            status = "FAILED"
            error_msg = str(e)
            error_category = type(e).__name__
            outcome_summary = f"{self.name} encountered error: {error_msg}"
            output_data = {"error": error_msg, "error_category": error_category}

        duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        end_time = datetime.now(timezone.utc)

        # Persist execution log in PostgreSQL
        try:
            execution_log = AgentExecution(
                agent_name=self.name,
                agent_version=self.version,
                task_type=self.task_type,
                record_id=str(record_id) if record_id else None,
                status=status,
                start_time=start_time,
                end_time=end_time,
                duration_ms=duration_ms,
                outcome_summary=outcome_summary[:500],
                details={
                    "parameters": {k: str(v)[:200] for k, v in kwargs.items() if k not in ["password", "token", "key"]},
                    "output_preview": {k: str(v)[:200] for k, v in output_data.items() if k != "full_data"}
                },
                error_category=error_category,
                retry_count=0
            )
            db.add(execution_log)
            db.commit()
        except Exception as log_err:
            db.rollback()
            # Do not allow logging failure to crash agent result return

        return AgentResult(
            agent_name=self.name,
            agent_version=self.version,
            task_type=self.task_type,
            record_id=record_id,
            status=status,
            duration_ms=duration_ms,
            outcome_summary=outcome_summary,
            data=output_data,
            error=error_msg
        )
