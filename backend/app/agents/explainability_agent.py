from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.agents.base import BaseAgent
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.services.ml_service import ml_inference_service
from ml.pipeline import engineer_features, CATEGORICAL_FEATURES, NUMERIC_FEATURES

class ExplainabilityAgent(BaseAgent):
    """
    Agent C: Explainability Agent
    Produces granular feature-attribution decompositions, directional factor contributions,
    and plain-language risk driver narratives without conflating statistical correlation with causation.
    """
    def __init__(self):
        super().__init__(
            name="ExplainabilityAgent",
            version="2.0.0",
            task_type="FEATURE_ATTRIBUTION_AND_EXPLANATION"
        )

    def _execute(self, db: Session, record_id: Optional[str], **kwargs) -> Dict[str, Any]:
        transaction: Optional[Transaction] = None
        prediction: Optional[FraudPrediction] = None

        if record_id:
            transaction = db.query(Transaction).filter(Transaction.id == record_id).first()
            if transaction:
                prediction = db.query(FraudPrediction).filter(FraudPrediction.transaction_id == transaction.id).first()

        tx_data = kwargs.get("transaction_data")
        if not tx_data and transaction:
            tx_data = {
                "step": transaction.step,
                "type": transaction.type,
                "amount": transaction.amount,
                "name_orig": transaction.name_orig,
                "oldbalance_org": transaction.oldbalance_org,
                "newbalance_orig": transaction.newbalance_orig,
                "name_dest": transaction.name_dest,
                "oldbalance_dest": transaction.oldbalance_dest,
                "newbalance_dest": transaction.newbalance_dest,
            }

        if not tx_data:
            raise ValueError("No transaction data or valid record_id provided for explainability analysis.")

        # Ensure model is available
        if not ml_inference_service.is_available:
            ml_inference_service.reload_model()
            if not ml_inference_service.is_available:
                return {
                    "status": "UNAVAILABLE",
                    "summary": "Model artifact not available. Feature attribution explanations cannot be computed.",
                    "attributions": []
                }

        model_version = ml_inference_service.current_version
        metadata = ml_inference_service.metadata or {}
        feature_importances = metadata.get("feature_importance", {})

        # Compute engineered features
        df_single = pd.DataFrame([{
            "step": int(tx_data.get("step", 1)),
            "type": str(tx_data.get("type", "PAYMENT")),
            "amount": float(tx_data.get("amount", 0.0)),
            "nameOrig": str(tx_data.get("name_orig", "Unknown")),
            "oldbalanceOrg": float(tx_data.get("oldbalance_org", 0.0)),
            "newbalanceOrig": float(tx_data.get("newbalance_orig", 0.0)),
            "nameDest": str(tx_data.get("name_dest", "Unknown")),
            "oldbalanceDest": float(tx_data.get("oldbalance_dest", 0.0)),
            "newbalanceDest": float(tx_data.get("newbalance_dest", 0.0)),
        }])
        df_feat = engineer_features(df_single)

        # Baseline comparisons for synthetic PaySim distributions
        # Legitimate median baseline values
        baselines = {
            "amount": 2500.0,
            "orig_drain_ratio": 0.15,
            "dest_was_zero": 0.20,
            "orig_is_zero": 0.05,
            "dest_is_merchant": 0.40,
        }

        # Calculate directional contribution per key feature
        # Contribution score reflects: Feature Importance Weight * Standardized Deviation from Legitimate Mean
        attributions: List[Dict[str, Any]] = []

        # 1. Drain ratio
        drain_ratio = float(df_feat.iloc[0]["orig_drain_ratio"])
        drain_weight = feature_importances.get("orig_drain_ratio", 0.35)
        drain_impact = (drain_ratio - baselines["orig_drain_ratio"]) * drain_weight
        attributions.append({
            "feature": "orig_drain_ratio",
            "display_name": "Account Drain Magnitude",
            "value": f"{drain_ratio*100:.1f}%",
            "direction": "INCREASES_RISK" if drain_impact > 0.05 else "NEUTRAL",
            "weight": round(drain_weight, 4),
            "contribution_score": round(drain_impact, 4),
            "explanation": f"Originator liquidated {drain_ratio*100:.1f}% of starting balance (population typical: {baselines['orig_drain_ratio']*100:.0f}%)."
        })

        # 2. Transaction Type Channel
        tx_type = str(df_single.iloc[0]["type"])
        is_high_risk_channel = tx_type in ["TRANSFER", "CASH_OUT"]
        type_weight = 0.25
        type_impact = type_weight if is_high_risk_channel else -0.15
        attributions.append({
            "feature": "type",
            "display_name": "Execution Channel",
            "value": tx_type,
            "direction": "INCREASES_RISK" if is_high_risk_channel else "DECREASES_RISK",
            "weight": type_weight,
            "contribution_score": round(type_impact, 4),
            "explanation": f"Channel '{tx_type}' {'is the primary operational conduit for fraud' if is_high_risk_channel else 'carries historically low fraud probability'}."
        })

        # 3. Empty Recipient Inflow
        dest_zero = int(df_feat.iloc[0]["dest_was_zero"])
        dest_zero_weight = feature_importances.get("dest_was_zero", 0.15)
        dest_impact = (dest_zero - baselines["dest_was_zero"]) * dest_zero_weight
        attributions.append({
            "feature": "dest_was_zero",
            "display_name": "Zero-Balance Recipient Status",
            "value": "Yes" if dest_zero else "No",
            "direction": "INCREASES_RISK" if dest_zero else "NEUTRAL",
            "weight": round(dest_zero_weight, 4),
            "contribution_score": round(dest_impact, 4),
            "explanation": "Recipient account had zero pre-existing balance before inbound transfer." if dest_zero else "Recipient had active pre-existing balance."
        })

        # 4. Monetary Volume (Log Amount)
        amount = float(df_single.iloc[0]["amount"])
        amt_weight = feature_importances.get("log_amount", 0.12)
        amt_ratio = np.log1p(amount) / np.log1p(baselines["amount"])
        amt_impact = (amt_ratio - 1.0) * amt_weight
        attributions.append({
            "feature": "amount",
            "display_name": "Monetary Volume",
            "value": f"${amount:,.2f}",
            "direction": "INCREASES_RISK" if amount > 50000 else "DECREASES_RISK",
            "weight": round(amt_weight, 4),
            "contribution_score": round(amt_impact, 4),
            "explanation": f"Volume ${amount:,.2f} {'significantly exceeds normal transaction bands' if amount > 50000 else 'is within standard operational variance'}."
        })

        # Sort by absolute contribution score
        attributions.sort(key=lambda x: abs(x["contribution_score"]), reverse=True)

        summary_narrative = (
            f"Explainability analysis under Model {model_version}. "
            f"Top risk-increasing driver was '{attributions[0]['display_name']}' ({attributions[0]['explanation']}). "
            f"Identified {sum(1 for a in attributions if a['direction'] == 'INCREASES_RISK')} factor(s) elevating probability."
        )

        return {
            "model_version": model_version,
            "attributions": attributions,
            "summary": summary_narrative,
            "methodology": "Empirical Population Deviation & Gini Weight Decomposition",
            "causation_notice": "Feature attribution demonstrates statistical sensitivity within the model. It does not establish direct real-world causation."
        }

explainability_agent = ExplainabilityAgent()
