from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.agents.base import BaseAgent
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.models.alert import Alert
from backend.app.services.ml_service import ml_inference_service

class FraudDetectionAgent(BaseAgent):
    """
    Agent A: Fraud Detection Agent
    Validates input parameters, executes scikit-learn ML inference, assigns enterprise risk tier,
    persists predictions, and evaluates threshold-driven incident alerts.
    """
    def __init__(self):
        super().__init__(
            name="FraudDetectionAgent",
            version="2.0.0",
            task_type="INFERENCE_AND_RISK_SCORING"
        )

    def _execute(self, db: Session, record_id: Optional[str], **kwargs) -> Dict[str, Any]:
        tx_data = kwargs.get("transaction_data")
        transaction: Optional[Transaction] = None

        if record_id:
            transaction = db.query(Transaction).filter(Transaction.id == record_id).first()
            if transaction:
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
            raise ValueError("No transaction data or valid record_id provided for fraud inference.")

        # Validate core fields
        amount = float(tx_data.get("amount", 0.0))
        if amount <= 0:
            raise ValueError(f"Invalid monetary amount: {amount}. Must be strictly positive.")

        # Run ML Inference
        if not ml_inference_service.is_available:
            ml_inference_service.reload_model()
            if not ml_inference_service.is_available:
                return {
                    "status": "DEGRADED",
                    "fraud_probability": 0.0,
                    "risk_level": "UNSCORED",
                    "model_version": "unavailable",
                    "summary": "Model artifact unavailable. Transaction saved in pending scoring state.",
                    "disclaimer": "Automated scoring degraded: active model artifact not mounted."
                }

        pred_result = ml_inference_service.predict_single(tx_data)

        prediction_id = None
        alert_id = None

        # Persist prediction if transaction record exists
        if transaction:
            existing_pred = db.query(FraudPrediction).filter(FraudPrediction.transaction_id == transaction.id).first()
            if existing_pred:
                existing_pred.fraud_probability = pred_result["fraud_probability"]
                existing_pred.risk_level = pred_result["risk_level"]
                existing_pred.is_predicted_fraud = pred_result["is_predicted_fraud"]
                existing_pred.model_version = pred_result["model_version"]
                existing_pred.explanation = pred_result["explanation"]
                db.flush()
                prediction_id = str(existing_pred.id)
            else:
                new_pred = FraudPrediction(
                    transaction_id=transaction.id,
                    fraud_probability=pred_result["fraud_probability"],
                    risk_level=pred_result["risk_level"],
                    is_predicted_fraud=pred_result["is_predicted_fraud"],
                    model_version=pred_result["model_version"],
                    model_name=pred_result["model_name"],
                    explanation=pred_result["explanation"],
                    prediction_notice=pred_result["prediction_notice"]
                )
                db.add(new_pred)
                db.flush()
                prediction_id = str(new_pred.id)

            # Create or update alert if risk threshold is breached (MEDIUM, HIGH, CRITICAL)
            if pred_result["risk_level"] in ["MEDIUM", "HIGH", "CRITICAL"]:
                existing_alert = db.query(Alert).filter(Alert.transaction_id == transaction.id).first()
                if not existing_alert:
                    new_alert = Alert(
                        transaction_id=transaction.id,
                        prediction_id=prediction_id,
                        severity=pred_result["risk_level"],
                        status="NEW"
                    )
                    db.add(new_alert)
                    db.flush()
                    alert_id = str(new_alert.id)
                else:
                    existing_alert.severity = pred_result["risk_level"]
                    alert_id = str(existing_alert.id)

            db.commit()

        return {
            "transaction_id": str(transaction.id) if transaction else None,
            "prediction_id": prediction_id,
            "alert_id": alert_id,
            "fraud_probability": pred_result["fraud_probability"],
            "risk_level": pred_result["risk_level"],
            "is_predicted_fraud": pred_result["is_predicted_fraud"],
            "model_version": pred_result["model_version"],
            "model_name": pred_result["model_name"],
            "explanation": pred_result.get("explanation"),
            "summary": f"Scored probability {pred_result['fraud_probability']*100:.1f}% ({pred_result['risk_level']} Risk) via Model {pred_result['model_version']}.",
            "disclaimer": "Automated statistical prediction. Does not establish legal or factual proof of fraudulent conduct."
        }

fraud_detection_agent = FraudDetectionAgent()
