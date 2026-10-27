import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix
)
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

logger = logging.getLogger("tracex.ml")

PAYSIM_SCHEMA = {
    "step": int,
    "type": str,
    "amount": float,
    "nameOrig": str,
    "oldbalanceOrg": float,
    "newbalanceOrig": float,
    "nameDest": str,
    "oldbalanceDest": float,
    "newbalanceDest": float,
    "isFraud": int,
    "isFlaggedFraud": int
}

# Meaningful fraud-detection feature engineering without target leakage
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    # 1. Balance discrepancies (origination & destination)
    # Legitimate transactions balance: old - amount = new
    # Fraudulent transactions often empty the account completely or leave negative discrepancy
    df["orig_balance_diff"] = df["newbalanceOrig"] + df["amount"] - df["oldbalanceOrg"]
    df["dest_balance_diff"] = df["oldbalanceDest"] + df["amount"] - df["newbalanceDest"]
    
    # 2. Complete balance liquidation ratio
    df["orig_drain_ratio"] = np.where(
        df["oldbalanceOrg"] > 0,
        df["amount"] / (df["oldbalanceOrg"] + 1e-5),
        0.0
    )
    # Clip extreme ratios
    df["orig_drain_ratio"] = np.clip(df["orig_drain_ratio"], 0.0, 10.0)

    # 3. Destination balance was zero before transaction
    df["dest_was_zero"] = (df["oldbalanceDest"] == 0.0).astype(int)
    
    # 4. Origin balance is now zero
    df["orig_is_zero"] = (df["newbalanceOrig"] == 0.0).astype(int)
    
    # 5. Amount in log-scale to handle heavy skew
    df["log_amount"] = np.log1p(np.maximum(df["amount"], 0.0))
    
    # 6. Hour of day (step represents hour 1 to 744 in 30-day PaySim)
    df["hour_of_day"] = df["step"] % 24
    
    # 7. Destination account type prefix (C=Customer, M=Merchant)
    df["dest_is_merchant"] = df["nameDest"].astype(str).str.startswith("M").astype(int)

    return df

CATEGORICAL_FEATURES = ["type"]
NUMERIC_FEATURES = [
    "step", "amount", "oldbalanceOrg", "newbalanceOrig",
    "oldbalanceDest", "newbalanceDest",
    "orig_balance_diff", "dest_balance_diff",
    "orig_drain_ratio", "dest_was_zero", "orig_is_zero",
    "log_amount", "hour_of_day", "dest_is_merchant"
]

def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES)
        ],
        remainder="drop"
    )

def train_and_evaluate_models(
    df: pd.DataFrame,
    output_dir: str = "ml/models",
    model_version: str = "v1.0.0"
) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)

    # Feature Engineering
    logger.info("Performing feature engineering on %d records...", len(df))
    df_feat = engineer_features(df)

    # Chronological Split: Sort by 'step' (hour 1..744) to strictly avoid future leakage
    df_feat = df_feat.sort_values(by="step").reset_index(drop=True)
    
    n = len(df_feat)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)
    
    train_df = df_feat.iloc[:train_end]
    val_df = df_feat.iloc[train_end:val_end]
    test_df = df_feat.iloc[val_end:]
    
    feature_cols = CATEGORICAL_FEATURES + NUMERIC_FEATURES
    X_train, y_train = train_df[feature_cols], train_df["isFraud"].values
    X_val, y_val = val_df[feature_cols], val_df["isFraud"].values
    X_test, y_test = test_df[feature_cols], test_df["isFraud"].values

    logger.info("Dataset split: Train=%d (Frauds=%d), Val=%d (Frauds=%d), Test=%d (Frauds=%d)",
                len(X_train), int(y_train.sum()),
                len(X_val), int(y_val.sum()),
                len(X_test), int(y_test.sum()))

    # Candidate 1: Baseline Logistic Regression (Class-weighted)
    preprocessor_lr = build_preprocessor()
    lr_pipeline = Pipeline([
        ("preprocessor", preprocessor_lr),
        ("classifier", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42))
    ])
    logger.info("Training baseline LogisticRegression...")
    lr_pipeline.fit(X_train, y_train)

    # Candidate 2: Tree-Based Random Forest Classifier
    preprocessor_rf = build_preprocessor()
    rf_pipeline = Pipeline([
        ("preprocessor", preprocessor_rf),
        ("classifier", RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_split=10,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=-1
        ))
    ])
    logger.info("Training tree-based RandomForestClassifier...")
    rf_pipeline.fit(X_train, y_train)

    def evaluate(pipeline, X, y, name: str) -> Dict[str, Any]:
        y_prob = pipeline.predict_proba(X)[:, 1]
        y_pred = (y_prob >= 0.50).astype(int)
        
        cm = confusion_matrix(y, y_pred)
        # Confusion matrix: [[TN, FP], [FN, TP]]
        tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (int(cm[0, 0]), 0, 0, 0)
        
        pr_auc = float(average_precision_score(y, y_prob)) if len(np.unique(y)) > 1 else 0.0
        roc_auc = float(roc_auc_score(y, y_prob)) if len(np.unique(y)) > 1 else 0.0
        precision = float(precision_score(y, y_pred, zero_division=0))
        recall = float(recall_score(y, y_pred, zero_division=0))
        f1 = float(f1_score(y, y_pred, zero_division=0))

        return {
            "model_name": name,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "confusion_matrix": {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp)
            },
            "fraud_class_metrics": {
                "fraud_count": int(y.sum()),
                "detected_frauds": int(tp),
                "missed_frauds": int(fn),
                "false_alarms": int(fp)
            }
        }

    val_lr = evaluate(lr_pipeline, X_val, y_val, "Logistic Regression (Baseline)")
    val_rf = evaluate(rf_pipeline, X_val, y_val, "Random Forest (Tree-based)")

    logger.info("Validation Results - Baseline LR: PR-AUC=%.4f, F1=%.4f | RF: PR-AUC=%.4f, F1=%.4f",
                val_lr["pr_auc"], val_lr["f1"], val_rf["pr_auc"], val_rf["f1"])

    # Model Selection: select best by PR-AUC (Precision-Recall AUC is gold standard for imbalanced fraud)
    if val_rf["pr_auc"] >= val_lr["pr_auc"]:
        chosen_pipeline = rf_pipeline
        chosen_algorithm = "RandomForestClassifier"
        val_metrics = val_rf
        candidate_name = "Random Forest (Tree-based)"
    else:
        chosen_pipeline = lr_pipeline
        chosen_algorithm = "LogisticRegression"
        val_metrics = val_lr
        candidate_name = "Logistic Regression (Baseline)"

    # Final Evaluation on the untouched Test Set
    test_metrics = evaluate(chosen_pipeline, X_test, y_test, candidate_name)
    logger.info("Test Set Results for selected %s: PR-AUC=%.4f, F1=%.4f, Recall=%.4f, Precision=%.4f",
                candidate_name, test_metrics["pr_auc"], test_metrics["f1"], test_metrics["recall"], test_metrics["precision"])

    # Extract feature importance if available
    feature_importance = {}
    try:
        classifier = chosen_pipeline.named_steps["classifier"]
        if hasattr(classifier, "feature_importances_"):
            preprocessor = chosen_pipeline.named_steps["preprocessor"]
            cat_encoder = preprocessor.named_transformers_["cat"]
            cat_cols = list(cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES))
            all_feature_names = NUMERIC_FEATURES + cat_cols
            importances = classifier.feature_importances_
            feature_importance = {
                name: round(float(imp), 4)
                for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)[:10]
            }
    except Exception as e:
        logger.warning("Could not extract feature importances: %s", e)

    # Persist Best Model Artifact
    model_filepath = os.path.join(output_dir, f"model_{model_version}.joblib")
    joblib.dump(chosen_pipeline, model_filepath)

    metadata = {
        "version": model_version,
        "name": f"TraceX PaySim Fraud Classifier ({chosen_algorithm})",
        "algorithm": chosen_algorithm,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_dataset_size": len(X_train),
        "fraud_count_in_training": int(y_train.sum()),
        "validation_metrics": val_metrics,
        "test_metrics": test_metrics,
        "comparison": {
            "baseline_lr": val_lr,
            "tree_rf": val_rf
        },
        "feature_importance": feature_importance,
        "feature_names": CATEGORICAL_FEATURES + NUMERIC_FEATURES,
        "synthetic_data_disclaimer": (
            "Model trained on the PaySim synthetic financial transaction simulator. "
            "Evaluations reflect benchmark simulated behavioral patterns. "
            "Performance on synthetic data does not establish real-world fraud detection efficacy without continuous operational calibration."
        )
    }

    metadata_filepath = os.path.join(output_dir, f"metadata_{model_version}.json")
    with open(metadata_filepath, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Successfully saved model artifact to %s and metadata to %s", model_filepath, metadata_filepath)
    return metadata
