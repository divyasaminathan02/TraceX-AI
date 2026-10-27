import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.core.security import hash_password
from backend.app.models.user import User, UserRole
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.models.alert import Alert
from backend.app.models.case import InvestigationCase
from backend.app.services.ai_investigation_service import ai_investigation_service

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "healthy"
    assert "v1.0.0" in data["active_model_version"]

def test_login_success_and_jwt():
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@tracex.ai",
        "password": "AdminSecurePass123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@tracex.ai"
    assert data["user"]["role"] == "admin"

def test_login_invalid_credentials():
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@tracex.ai",
        "password": "WrongPassword999!"
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_dashboard_metrics_with_jwt():
    # Login as analyst
    login_res = client.post("/api/v1/auth/login", json={
        "email": "analyst@tracex.ai",
        "password": "AnalystSecurePass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/dashboard/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_transactions"] >= 0
    assert "risk_distribution" in data
    assert data["model_status"] == "OPERATIONAL"

def test_single_transaction_scoring_and_persistence():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "analyst@tracex.ai",
        "password": "AnalystSecurePass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    tx_payload = {
        "step": 45,
        "type": "TRANSFER",
        "amount": 210000.0,
        "name_orig": "C777123456",
        "oldbalance_org": 210000.0,
        "newbalance_orig": 0.0,
        "name_dest": "C888987654",
        "oldbalance_dest": 0.0,
        "newbalance_dest": 210000.0,
        "transaction_ref": f"TX-TEST-{tx_payload_hash()}"
    }

    response = client.post("/api/v1/transactions", json=tx_payload, headers=headers)
    assert response.status_code == 201
    tx_data = response.json()
    assert tx_data["amount"] == 210000.0
    assert tx_data["prediction"] is not None
    assert tx_data["prediction"]["fraud_probability"] > 0.0
    assert tx_data["prediction"]["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def test_viewer_role_restricted_from_admin_users():
    # Login as viewer
    login_res = client.post("/api/v1/auth/login", json={
        "email": "viewer@tracex.ai",
        "password": "ViewerSecurePass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access admin-only users list
    response = client.get("/api/v1/users", headers=headers)
    assert response.status_code == 403
    assert "Operation not permitted" in response.json()["detail"]

def test_ai_investigation_brief_service():
    tx = Transaction(
        transaction_ref="TX-MOCK-BRIEF",
        step=18,
        type="TRANSFER",
        amount=350000.0,
        name_orig="C900112233",
        oldbalance_org=350000.0,
        newbalance_orig=0.0,
        name_dest="C900998877",
        oldbalance_dest=0.0,
        newbalance_dest=350000.0
    )
    brief = ai_investigation_service.generate_case_brief(transaction=tx)
    assert "summary" in brief
    assert len(brief["observed_anomalies"]) >= 1
    assert len(brief["recommended_actions"]) >= 1
    assert "disclaimer" in brief

def tx_payload_hash() -> str:
    import uuid
    return uuid.uuid4().hex[:8].upper()
