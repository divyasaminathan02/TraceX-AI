import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.agents.base import AgentResult
from backend.app.agents.fraud_detection_agent import fraud_detection_agent
from backend.app.agents.investigation_agent import investigation_agent
from backend.app.agents.explainability_agent import explainability_agent
from backend.app.agents.alert_prioritization_agent import alert_prioritization_agent

logger = logging.getLogger("tracex.orchestrator")

# Timeout per agent in seconds
AGENT_TIMEOUT_SECONDS = 30


class AgentOrchestrator:
    """
    Controlled sequencing orchestrator for multi-agent fraud investigation pipeline.
    Executes agents in a defined order with timeout enforcement, error isolation,
    and persistent execution logging.
    """

    PIPELINE_SEQUENCE = [
        ("FraudDetection", fraud_detection_agent),
        ("Investigation", investigation_agent),
        ("Explainability", explainability_agent),
    ]

    def run_full_pipeline(
        self,
        db: Session,
        transaction_id: str,
        skip_agents: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Execute the complete fraud investigation pipeline for a transaction.
        Each agent runs independently - failure in one does not halt others.
        """
        skip_agents = skip_agents or []
        pipeline_start = time.perf_counter()
        started_at = datetime.now(timezone.utc)

        results: Dict[str, Any] = {}
        agent_summaries: List[str] = []
        errors: List[str] = []

        for agent_label, agent_instance in self.PIPELINE_SEQUENCE:
            if agent_label in skip_agents:
                results[agent_label] = {"status": "SKIPPED", "reason": "Excluded by caller"}
                agent_summaries.append(f"{agent_label}: SKIPPED")
                continue

            try:
                logger.info("Orchestrator: Running %s for transaction %s", agent_label, transaction_id)
                t0 = time.perf_counter()
                
                result: AgentResult = agent_instance.run(db=db, record_id=transaction_id)
                
                elapsed = time.perf_counter() - t0
                if elapsed > AGENT_TIMEOUT_SECONDS:
                    logger.warning(
                        "Agent %s exceeded timeout (%ss > %ss)",
                        agent_label, round(elapsed, 2), AGENT_TIMEOUT_SECONDS
                    )

                results[agent_label] = {
                    "status": result.status,
                    "duration_ms": result.duration_ms,
                    "summary": result.outcome_summary,
                    "data": result.data,
                    "error": result.error,
                }
                agent_summaries.append(
                    f"{agent_label}: {result.status} ({result.duration_ms}ms)"
                )
                if result.error:
                    errors.append(f"{agent_label}: {result.error}")

            except Exception as e:
                logger.error("Orchestrator: Agent %s crashed: %s", agent_label, e, exc_info=True)
                results[agent_label] = {
                    "status": "CRASHED",
                    "error": str(e),
                    "duration_ms": 0,
                }
                errors.append(f"{agent_label}: {str(e)}")
                agent_summaries.append(f"{agent_label}: CRASHED")

        total_duration_ms = round((time.perf_counter() - pipeline_start) * 1000, 2)

        # Compute overall status
        statuses = [r.get("status", "UNKNOWN") for r in results.values()]
        if all(s == "SUCCESS" for s in statuses):
            overall_status = "COMPLETE"
        elif any(s in ["CRASHED", "FAILED"] for s in statuses):
            overall_status = "PARTIAL_FAILURE"
        elif all(s == "SKIPPED" for s in statuses):
            overall_status = "ALL_SKIPPED"
        else:
            overall_status = "MIXED"

        return {
            "pipeline_status": overall_status,
            "transaction_id": transaction_id,
            "started_at": started_at.isoformat(),
            "total_duration_ms": total_duration_ms,
            "agent_results": results,
            "agent_summaries": agent_summaries,
            "errors": errors,
            "summary": (
                f"Pipeline {overall_status} in {total_duration_ms}ms. "
                f"Ran {len([s for s in statuses if s != 'SKIPPED'])} agent(s). "
                f"{len(errors)} error(s)."
            )
        }

    def run_alert_triage(self, db: Session, limit: int = 50) -> Dict[str, Any]:
        """Run the alert prioritization agent independently."""
        try:
            result = alert_prioritization_agent.run(db=db, limit=limit)
            return {
                "status": result.status,
                "data": result.data,
                "summary": result.outcome_summary,
            }
        except Exception as e:
            logger.error("Alert triage failed: %s", e, exc_info=True)
            return {
                "status": "FAILED",
                "error": str(e),
                "summary": f"Alert triage failed: {e}"
            }


orchestrator = AgentOrchestrator()
