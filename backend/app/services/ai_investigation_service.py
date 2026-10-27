from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.models.alert import Alert

class AIInvestigationService:
    """
    Evidence-based forensic analysis engine for financial transactions.
    Synthesizes empirical audit trails, behavioral differentials, and ML risk scores
    into actionable investigation summaries and structured recommendations.
    
    Architected as an extensible foundation for Phase 2 multi-agent orchestration.
    Note: Current implementation uses rigorous deterministic rules and evidence heuristics,
    not an autonomous LLM.
    """

    @staticmethod
    def generate_case_brief(
        transaction: Transaction,
        prediction: Optional[FraudPrediction] = None,
        alert: Optional[Alert] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes transaction attributes, mathematical anomalies, and ML risk signals
        into a structured forensic investigation report.
        """
        tx = transaction
        pred = prediction or (tx.prediction if hasattr(tx, "prediction") else None)

        # 1. Observed Empirical Evidence
        evidence_points: List[str] = [
            f"Transaction Reference: {tx.transaction_ref}",
            f"Execution Channel / Type: {tx.type}",
            f"Amount Transacted: ${tx.amount:,.2f}",
            f"Originator Account: {tx.name_orig}",
            f"Originator Pre-Balance: ${tx.oldbalance_org:,.2f} -> Post-Balance: ${tx.newbalance_orig:,.2f}",
            f"Beneficiary Account: {tx.name_dest}",
            f"Beneficiary Pre-Balance: ${tx.oldbalance_dest:,.2f} -> Post-Balance: ${tx.newbalance_dest:,.2f}",
            f"Temporal Sequence (Step): Hour {tx.step} (Hour {tx.step % 24:02d}:00 of diurnal cycle)"
        ]

        # 2. Mathematical & Behavioral Anomalies
        observed_anomalies: List[Dict[str, Any]] = []

        # Balance depletion
        if tx.oldbalance_org > 0 and tx.newbalance_orig == 0.0:
            observed_anomalies.append({
                "category": "Account Depletion",
                "finding": "Originating account was drained to exactly zero balance.",
                "significance": "High correlation with unauthorized account takeover or mule cash-out."
            })
        
        # Balance difference check
        expected_new_orig = tx.oldbalance_org - tx.amount
        if tx.type in ["CASH_OUT", "TRANSFER"] and abs(tx.newbalance_orig - expected_new_orig) > 0.01:
            observed_anomalies.append({
                "category": "Ledger Accounting Discrepancy",
                "finding": f"Originator balance delta does not equal transfer amount. Discrepancy of ${abs(tx.newbalance_orig - expected_new_orig):,.2f}.",
                "significance": "Indicates abnormal ledger manipulation or atypical clearing behavior."
            })

        # Recipient new account pattern
        if tx.oldbalance_dest == 0.0 and tx.amount > 10000.0:
            observed_anomalies.append({
                "category": "Empty Recipient Inflow",
                "finding": f"Beneficiary account possessed a zero balance prior to receiving ${tx.amount:,.2f}.",
                "significance": "Classic hallmark of intermediate mule accounts created to stage layered transfers."
            })

        # 3. Model Inference Signals
        model_signals: Dict[str, Any] = {
            "model_version": pred.model_version if pred else "N/A",
            "fraud_probability": pred.fraud_probability if pred else 0.0,
            "assigned_risk_tier": pred.risk_level if pred else "UNCLASSIFIED",
            "model_confidence_flag": pred.is_predicted_fraud if pred else False
        }

        # 4. Actionable Next Steps (Non-conclusive recommendations)
        recommended_actions: List[Dict[str, str]] = []
        
        if pred and pred.fraud_probability >= 0.70:
            recommended_actions.append({
                "step": "Place Provisional Hold",
                "urgency": "Immediate",
                "guidance": "Temporarily pause pending outbound settlement or cash-out requests pending originator phone verification."
            })
            recommended_actions.append({
                "step": "Contact Account Holder",
                "urgency": "High",
                "guidance": f"Initiate secondary out-of-band verification with customer {tx.name_orig} to confirm authorized initiation."
            })
        elif pred and pred.fraud_probability >= 0.35:
            recommended_actions.append({
                "step": "Request Enhanced Due Diligence (EDD)",
                "urgency": "Standard",
                "guidance": f"Review 30-day historical activity profile for destination {tx.name_dest} across regional network."
            })
        else:
            recommended_actions.append({
                "step": "Standard Monitoring",
                "urgency": "Routine",
                "guidance": "No immediate freeze required. Keep case open for automated behavioral baseline tracking."
            })

        recommended_actions.append({
            "step": "Cross-Reference Beneficiary",
            "urgency": "Medium",
            "guidance": f"Query beneficiary {tx.name_dest} against internal AML watchlists and historical SAR filings."
        })

        summary_text = (
            f"Automated forensic review of {tx.transaction_ref} ({tx.type} of ${tx.amount:,.2f}). "
            f"The transaction exhibited {len(observed_anomalies)} empirical anomaly indicator(s). "
            f"Machine learning model assigned a fraud probability of {model_signals['fraud_probability']*100:.1f}% "
            f"({model_signals['assigned_risk_tier']} Risk). "
            "Evidence suggests immediate analyst verification without definitive assumption of bad faith."
        )

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "service_engine": "TraceX Deterministic Evidence & Forensic Synthesis Engine v1.0",
            "summary": summary_text,
            "evidence_points": evidence_points,
            "observed_anomalies": observed_anomalies,
            "model_signals": model_signals,
            "recommended_actions": recommended_actions,
            "disclaimer": "This brief provides automated decision-support intelligence. Final regulatory determinations (SAR/STR) require certified human analyst review."
        }

ai_investigation_service = AIInvestigationService()
