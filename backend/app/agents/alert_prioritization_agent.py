from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.agents.base import BaseAgent
from backend.app.models.alert import Alert
from backend.app.models.prediction import FraudPrediction
from backend.app.models.transaction import Transaction
from backend.app.models.analyst_feedback import AnalystFeedback


class AlertPrioritizationAgent(BaseAgent):
    """
    Agent D: Alert Prioritization Agent
    Performs deterministic risk-score prioritization of pending alerts,
    applies deduplication heuristics, and respects analyst override labels.
    """
    def __init__(self):
        super().__init__(
            name="AlertPrioritizationAgent",
            version="2.0.0",
            task_type="ALERT_TRIAGE_AND_PRIORITIZATION"
        )

    def _execute(self, db: Session, record_id: Optional[str], **kwargs) -> Dict[str, Any]:
        limit = int(kwargs.get("limit", 50))
        include_dismissed = kwargs.get("include_dismissed", False)

        # Fetch unresolved alerts
        query = db.query(Alert).filter(Alert.status.in_(["NEW", "REVIEWING"]))
        if include_dismissed:
            query = db.query(Alert).filter(Alert.status != "CLOSED")
        
        raw_alerts = query.order_by(desc(Alert.created_at)).limit(limit * 2).all()

        if not raw_alerts:
            return {
                "prioritized_alerts": [],
                "total_processed": 0,
                "duplicates_suppressed": 0,
                "analyst_overrides_applied": 0,
                "summary": "No pending alerts found for prioritization."
            }

        # Enrich each alert with its prediction score and analyst feedback
        scored_alerts: List[Dict[str, Any]] = []
        seen_tx_ids = set()
        duplicates_suppressed = 0
        analyst_overrides = 0

        for alert in raw_alerts:
            tx_id = str(alert.transaction_id)

            # Deduplicate: skip if we already have a higher-priority alert for same transaction
            if tx_id in seen_tx_ids:
                duplicates_suppressed += 1
                continue
            seen_tx_ids.add(tx_id)

            # Get prediction score
            prediction = db.query(FraudPrediction).filter(
                FraudPrediction.transaction_id == alert.transaction_id
            ).first()
            fraud_prob = prediction.fraud_probability if prediction else 0.0

            # Check for analyst feedback override
            feedback = db.query(AnalystFeedback).filter(
                AnalystFeedback.transaction_id == alert.transaction_id
            ).order_by(desc(AnalystFeedback.created_at)).first()

            override_label = None
            if feedback:
                override_label = feedback.label
                analyst_overrides += 1

            # Compute composite priority score
            # Base: fraud probability (0-1)
            priority_score = fraud_prob

            # Severity multiplier
            severity_multiplier = {
                "CRITICAL": 1.5,
                "HIGH": 1.2,
                "MEDIUM": 1.0,
                "LOW": 0.7,
            }.get(alert.severity, 1.0)
            priority_score *= severity_multiplier

            # Analyst override adjustments
            if override_label == "CONFIRMED_FRAUD":
                priority_score = max(priority_score, 0.99)  # Force to top
            elif override_label == "LEGITIMATE":
                priority_score *= 0.1  # Suppress
            elif override_label == "NEEDS_FURTHER_REVIEW":
                priority_score = max(priority_score, 0.80)

            # Get transaction details
            transaction = db.query(Transaction).filter(
                Transaction.id == alert.transaction_id
            ).first()

            scored_alerts.append({
                "alert_id": str(alert.id),
                "transaction_id": tx_id,
                "transaction_ref": transaction.transaction_ref if transaction else "Unknown",
                "amount": transaction.amount if transaction else 0.0,
                "tx_type": transaction.type if transaction else "Unknown",
                "severity": alert.severity,
                "status": alert.status,
                "fraud_probability": round(fraud_prob, 4),
                "priority_score": round(priority_score, 4),
                "analyst_override": override_label,
                "created_at": alert.created_at.isoformat() if alert.created_at else None,
            })

        # Sort by priority score descending
        scored_alerts.sort(key=lambda x: x["priority_score"], reverse=True)

        # Assign triage tier labels
        for i, alert_item in enumerate(scored_alerts):
            if alert_item["priority_score"] >= 0.85:
                alert_item["triage_tier"] = "CRITICAL_IMMEDIATE"
            elif alert_item["priority_score"] >= 0.60:
                alert_item["triage_tier"] = "HIGH_PRIORITY"
            elif alert_item["priority_score"] >= 0.30:
                alert_item["triage_tier"] = "STANDARD_REVIEW"
            else:
                alert_item["triage_tier"] = "LOW_MONITORING"
            alert_item["rank"] = i + 1

        final_alerts = scored_alerts[:limit]

        tier_counts = {}
        for a in final_alerts:
            tier = a["triage_tier"]
            tier_counts[tier] = tier_counts.get(tier, 0) + 1

        summary = (
            f"Prioritized {len(final_alerts)} alert(s) from {len(raw_alerts)} raw entries. "
            f"Suppressed {duplicates_suppressed} duplicate(s). "
            f"Applied {analyst_overrides} analyst override(s). "
            f"Tier breakdown: {', '.join(f'{k}: {v}' for k, v in tier_counts.items())}."
        )

        return {
            "prioritized_alerts": final_alerts,
            "total_processed": len(raw_alerts),
            "duplicates_suppressed": duplicates_suppressed,
            "analyst_overrides_applied": analyst_overrides,
            "tier_distribution": tier_counts,
            "summary": summary
        }


alert_prioritization_agent = AlertPrioritizationAgent()
