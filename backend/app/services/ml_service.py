import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
import joblib
from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.models.model_metadata import ModelMetadata
from ml.pipeline import engineer_features, CATEGORICAL_FEATURES, NUMERIC_FEATURES

logger = logging.getLogger("tracex.ml.inference")

class MLInferenceService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLInferenceService, cls).__new__(cls)
            cls._instance._model = None
            cls._instance._metadata = None
            cls._instance._version = None
            cls._instance.reload_model()
        return cls._instance

    def reload_model(self):
        """Loads or reloads the active model pipeline from disk and DB."""
        try:
            root_dir = Path(__file__).resolve().parents[3]
            model_dir = Path(settings.ML_MODEL_DIR)
            if not model_dir.is_absolute():
                model_dir = root_dir / model_dir
            if not model_dir.exists():
                logger.warning("ML model directory does not exist: %s", model_dir)
                self._model = None
                self._metadata = None
                self._version = "none"
                return

            active_version = "v1.0.0"
            try:
                db = SessionLocal()
                active_meta = db.query(ModelMetadata).filter(ModelMetadata.is_active == True).first()
                if active_meta:
                    active_version = active_meta.version
                db.close()
            except Exception as dbe:
                logger.warning("Could not read active model from DB: %s", dbe)

            model_path = model_dir / f"model_{active_version}.joblib"
            meta_path = model_dir / f"metadata_{active_version}.json"

            if model_path.exists():
                self._model = joblib.load(str(model_path))
                self._version = active_version
                if meta_path.exists():
                    with open(meta_path, "r", encoding="utf-8") as f:
                        self._metadata = json.load(f)
                logger.info("Successfully loaded ML model version: %s", active_version)
            else:
                logger.warning("Model file not found at %s", model_path)
                self._model = None
                self._metadata = None
                self._version = "none"
        except Exception as e:
            logger.error("Failed to load ML model: %s", e)
            self._model = None
            self._metadata = None
            self._version = "none"

    @property
    def is_available(self) -> bool:
        return self._model is not None

    @property
    def current_version(self) -> str:
        return self._version or "none"

    @property
    def metadata(self) -> Optional[Dict[str, Any]]:
        return self._metadata

    def predict_single(self, tx_data: Dict[str, Any]) -> Dict[str, Any]:
        """Runs inference on a single transaction and generates detailed risk factors."""
        if not self.is_available:
            self.reload_model()
            if not self.is_available:
                raise RuntimeError("ML model is not loaded or unavailable on server.")

        df_single = pd.DataFrame([{
            "step": int(tx_data.get("step", 1)),
            "type": str(tx_data.get("type", "PAYMENT")),
            "amount": float(tx_data.get("amount", 0.0)),
            "nameOrig": str(tx_data.get("name_orig") or tx_data.get("nameOrig", "Unknown")),
            "oldbalanceOrg": float(tx_data.get("oldbalance_org") or tx_data.get("oldbalanceOrg", 0.0)),
            "newbalanceOrig": float(tx_data.get("newbalance_orig") or tx_data.get("newbalanceOrig", 0.0)),
            "nameDest": str(tx_data.get("name_dest") or tx_data.get("nameDest", "Unknown")),
            "oldbalanceDest": float(tx_data.get("oldbalance_dest") or tx_data.get("oldbalanceDest", 0.0)),
            "newbalanceDest": float(tx_data.get("newbalance_dest") or tx_data.get("newbalanceDest", 0.0)),
        }])

        df_feat = engineer_features(df_single)
        feature_cols = CATEGORICAL_FEATURES + NUMERIC_FEATURES
        X = df_feat[feature_cols]

        prob = float(self._model.predict_proba(X)[0, 1])

        # Risk Classification based on calibrated enterprise thresholds
        if prob >= settings.RISK_THRESHOLD_HIGH:
            risk_level = "CRITICAL"
        elif prob >= settings.RISK_THRESHOLD_MEDIUM:
            risk_level = "HIGH"
        elif prob >= settings.RISK_THRESHOLD_LOW:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        is_fraud = prob >= 0.50

        # Detailed Risk Explanations and Behavioral Drivers
        factors = []
        tx_type = df_single.iloc[0]["type"]
        amount = df_single.iloc[0]["amount"]
        old_orig = df_single.iloc[0]["oldbalanceOrg"]
        new_orig = df_single.iloc[0]["newbalanceOrig"]
        old_dest = df_single.iloc[0]["oldbalanceDest"]
        drain_ratio = df_feat.iloc[0]["orig_drain_ratio"]

        if tx_type in ["TRANSFER", "CASH_OUT"]:
            factors.append({
                "factor": "High-Risk Channel",
                "severity": "HIGH",
                "description": f"Transaction type '{tx_type}' represents the primary fraud vector observed in synthetic financial benchmarks."
            })
        
        if drain_ratio >= 0.95 and old_orig > 1000:
            factors.append({
                "factor": "Account Liquidation Pattern",
                "severity": "CRITICAL",
                "description": f"Originator balance was drained by {drain_ratio*100:.1f}%, leaving new balance at ${new_orig:,.2f}."
            })

        if old_dest == 0.0 and amount > 5000:
            factors.append({
                "factor": "Zero-Balance Destination Account",
                "severity": "MEDIUM",
                "description": "Recipient account had zero pre-existing balance before accepting a high-value transfer, typical of newly created mule accounts."
            })

        if amount > 200000:
            factors.append({
                "factor": "Large Capital Transfer",
                "severity": "HIGH",
                "description": f"Transaction volume of ${amount:,.2f} exceeds standard operational review thresholds."
            })

        if not factors and prob > 0.30:
            factors.append({
                "factor": "Statistical Anomaly",
                "severity": "MEDIUM",
                "description": "Composite transaction attributes deviate from typical legitimate customer baselines."
            })

        return {
            "fraud_probability": round(prob, 4),
            "risk_level": risk_level,
            "is_predicted_fraud": is_fraud,
            "model_version": self._version,
            "model_name": self._metadata.get("name", "TraceX Classifier") if self._metadata else "TraceX Model",
            "explanation": {
                "risk_factors": factors,
                "engineered_indicators": {
                    "orig_drain_ratio": round(float(drain_ratio), 4),
                    "orig_balance_diff": round(float(df_feat.iloc[0]["orig_balance_diff"]), 2),
                    "dest_balance_diff": round(float(df_feat.iloc[0]["dest_balance_diff"]), 2),
                    "hour_of_day": int(df_feat.iloc[0]["hour_of_day"]),
                }
            },
            "prediction_notice": "This result is an automated statistical prediction, not proof of fraud."
        }

    def predict_batch(self, df_records: pd.DataFrame) -> List[Dict[str, Any]]:
        """Batch inference for CSV imports."""
        if not self.is_available:
            self.reload_model()
            if not self.is_available:
                raise RuntimeError("ML model is not loaded or unavailable on server.")

        df_feat = engineer_features(df_records)
        feature_cols = CATEGORICAL_FEATURES + NUMERIC_FEATURES
        X = df_feat[feature_cols]

        probs = self._model.predict_proba(X)[:, 1]

        results = []
        for i, prob in enumerate(probs):
            p = float(prob)
            if p >= settings.RISK_THRESHOLD_HIGH:
                r_level = "CRITICAL"
            elif p >= settings.RISK_THRESHOLD_MEDIUM:
                r_level = "HIGH"
            elif p >= settings.RISK_THRESHOLD_LOW:
                r_level = "MEDIUM"
            else:
                r_level = "LOW"
            
            results.append({
                "fraud_probability": round(p, 4),
                "risk_level": r_level,
                "is_predicted_fraud": p >= 0.50,
                "model_version": self._version,
                "model_name": self._metadata.get("name", "TraceX Classifier") if self._metadata else "TraceX Model",
                "prediction_notice": "This result is an automated statistical prediction, not proof of fraud."
            })
        return results

ml_inference_service = MLInferenceService()
