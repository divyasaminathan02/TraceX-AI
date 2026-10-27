import logging
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal
from backend.app.core.security import hash_password
from backend.app.core.config import settings
from backend.app.models.user import User, UserRole
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.models.alert import Alert
from backend.app.models.case import InvestigationCase, CaseNote, CaseStatusHistory
from backend.app.models.notification import Notification
from backend.app.services.ml_service import ml_inference_service
from backend.app.services.ai_investigation_service import ai_investigation_service
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tracex.bootstrap")

def init_db_bootstrap():
    """Seeds initial administrator, role accounts, and baseline financial records if empty."""
    db: Session = SessionLocal()
    try:
        # 1. Seed Accounts
        admin_user = db.query(User).filter(User.email == settings.INITIAL_ADMIN_EMAIL.lower()).first()
        if not admin_user:
            admin_user = User(
                email=settings.INITIAL_ADMIN_EMAIL.lower(),
                full_name=settings.INITIAL_ADMIN_NAME,
                hashed_password=hash_password(settings.INITIAL_ADMIN_PASSWORD),
                role=UserRole.ADMIN.value,
                is_active=True
            )
            db.add(admin_user)
            logger.info("Created initial administrator: %s", admin_user.email)

        analyst_user = db.query(User).filter(User.email == "analyst@tracex.ai").first()
        if not analyst_user:
            analyst_user = User(
                email="analyst@tracex.ai",
                full_name="Lead Fraud Analyst",
                hashed_password=hash_password("AnalystSecurePass123!"),
                role=UserRole.ANALYST.value,
                is_active=True
            )
            db.add(analyst_user)
            logger.info("Created lead analyst account: %s", analyst_user.email)

        viewer_user = db.query(User).filter(User.email == "viewer@tracex.ai").first()
        if not viewer_user:
            viewer_user = User(
                email="viewer@tracex.ai",
                full_name="Executive Risk Officer",
                hashed_password=hash_password("ViewerSecurePass123!"),
                role=UserRole.VIEWER.value,
                is_active=True
            )
            db.add(viewer_user)
            logger.info("Created viewer account: %s", viewer_user.email)

        db.commit()

        # 2. Seed Baseline Transactions & Alerts if database transactions table is empty
        tx_count = db.query(Transaction).count()
        if tx_count == 0:
            logger.info("Database transactions table is empty. Seeding initial baseline financial records...")
            
            sample_records = [
                {
                    "step": 12, "type": "TRANSFER", "amount": 284500.0,
                    "name_orig": "C104928172", "oldbalance_org": 284500.0, "newbalance_orig": 0.0,
                    "name_dest": "C892183921", "oldbalance_dest": 0.0, "newbalance_dest": 284500.0,
                    "ref": "TX-SIM-90281"
                },
                {
                    "step": 14, "type": "CASH_OUT", "amount": 195000.0,
                    "name_orig": "C782910243", "oldbalance_org": 195000.0, "newbalance_orig": 0.0,
                    "name_dest": "C239810928", "oldbalance_dest": 0.0, "newbalance_dest": 0.0,
                    "ref": "TX-SIM-90282"
                },
                {
                    "step": 20, "type": "PAYMENT", "amount": 142.50,
                    "name_orig": "C549102938", "oldbalance_org": 2400.0, "newbalance_orig": 2257.50,
                    "name_dest": "M182930192", "oldbalance_dest": 12000.0, "newbalance_dest": 12142.50,
                    "ref": "TX-SIM-90283"
                },
                {
                    "step": 24, "type": "PAYMENT", "amount": 89.99,
                    "name_orig": "C992102931", "oldbalance_org": 450.0, "newbalance_orig": 360.01,
                    "name_dest": "M928301923", "oldbalance_dest": 45000.0, "newbalance_dest": 45089.99,
                    "ref": "TX-SIM-90284"
                },
                {
                    "step": 28, "type": "CASH_IN", "amount": 5000.0,
                    "name_orig": "C339102910", "oldbalance_org": 1200.0, "newbalance_orig": 6200.0,
                    "name_dest": "C112930192", "oldbalance_dest": 50000.0, "newbalance_dest": 45000.0,
                    "ref": "TX-SIM-90285"
                },
                {
                    "step": 32, "type": "TRANSFER", "amount": 540000.0,
                    "name_orig": "C662910294", "oldbalance_org": 540000.0, "newbalance_orig": 0.0,
                    "name_dest": "C772930191", "oldbalance_dest": 0.0, "newbalance_dest": 540000.0,
                    "ref": "TX-SIM-90286"
                },
                {
                    "step": 35, "type": "DEBIT", "amount": 350.0,
                    "name_orig": "C442910298", "oldbalance_org": 3200.0, "newbalance_orig": 2850.0,
                    "name_dest": "C882930199", "oldbalance_dest": 14000.0, "newbalance_dest": 14350.0,
                    "ref": "TX-SIM-90287"
                }
            ]

            first_case_created = False

            for rec in sample_records:
                tx = Transaction(
                    transaction_ref=rec["ref"],
                    step=rec["step"],
                    type=rec["type"],
                    amount=rec["amount"],
                    name_orig=rec["name_orig"],
                    oldbalance_org=rec["oldbalance_org"],
                    newbalance_orig=rec["newbalance_orig"],
                    name_dest=rec["name_dest"],
                    oldbalance_dest=rec["oldbalance_dest"],
                    newbalance_dest=rec["newbalance_dest"],
                    is_flagged_fraud_actual=1 if rec["amount"] > 200000 else 0
                )
                db.add(tx)
                db.flush()

                # ML Prediction
                pred_out = ml_inference_service.predict_single(rec)
                pred = FraudPrediction(
                    transaction_id=tx.id,
                    fraud_probability=pred_out["fraud_probability"],
                    risk_level=pred_out["risk_level"],
                    is_predicted_fraud=pred_out["is_predicted_fraud"],
                    model_version=pred_out["model_version"],
                    model_name=pred_out["model_name"],
                    explanation=pred_out["explanation"],
                    prediction_notice=pred_out["prediction_notice"]
                )
                db.add(pred)
                db.flush()

                if pred.risk_level in ["MEDIUM", "HIGH", "CRITICAL"]:
                    alert = Alert(
                        transaction_id=tx.id,
                        prediction_id=pred.id,
                        severity=pred.risk_level,
                        status="NEW" if not first_case_created else "UNDER_INVESTIGATION",
                        assigned_to_id=analyst_user.id
                    )
                    db.add(alert)
                    db.flush()

                    if not first_case_created and pred.risk_level == "CRITICAL":
                        first_case_created = True
                        ai_brief = ai_investigation_service.generate_case_brief(transaction=tx)
                        inv_case = InvestigationCase(
                            case_number="CASE-2026-0001",
                            title=f"Critical Account Drain Outflow ({rec['ref']})",
                            description=f"Automated alert triggered by account total liquidation of ${rec['amount']:,.2f}.",
                            priority="URGENT",
                            status="IN_PROGRESS",
                            transaction_id=tx.id,
                            alert_id=alert.id,
                            assigned_to_id=analyst_user.id,
                            created_by_id=admin_user.id,
                            ai_investigation_summary=ai_brief
                        )
                        db.add(inv_case)
                        db.flush()

                        db.add(CaseStatusHistory(
                            case_id=inv_case.id,
                            changed_by_id=analyst_user.id,
                            old_status="OPEN",
                            new_status="IN_PROGRESS",
                            comment="Case assigned to Senior Analyst for rapid beneficiary cross-referencing."
                        ))

                        db.add(CaseNote(
                            case_id=inv_case.id,
                            author_id=analyst_user.id,
                            content="Out-of-band verification placed with customer phone on file. Awaiting voice authentication response."
                        ))

            # Add sample system notification
            db.add(Notification(
                user_id=admin_user.id,
                title="TraceX Intelligence Platform Initialized",
                message="PostgreSQL cluster and ML model pipeline v1.0.0 are active and monitoring real-time flow.",
                type="SYSTEM",
                is_read=False
            ))

            db.commit()
            logger.info("Successfully seeded baseline demonstration transactions and cases.")

    except Exception as e:
        db.rollback()
        logger.error("Bootstrap error: %s", e)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_db_bootstrap()
