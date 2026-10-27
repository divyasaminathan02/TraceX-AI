# TraceX AI — Enterprise Financial Fraud Intelligence Platform (Phase 1)

**TraceX AI** is a full-stack, enterprise-grade financial transaction fraud detection and forensic risk intelligence platform. Built with a FastAPI backend, PostgreSQL persistence, a Scikit-Learn machine learning pipeline with the PaySim synthetic transaction schema, and a high-polish React / TypeScript / Vite dashboard.

---

## 1. Architectural Architecture & Tech Stack

| Layer | Technologies | Key Capabilities |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, React Router v7 | Enterprise midnight navy & cyan theme, 12 functional operational views, responsive layout, glassmorphic panels, real-time KPI telemetry. |
| **Backend** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Psycopg2 | Asynchronous REST API, JWT authentication, RBAC (Admin, Analyst, Viewer), audit logging, batch streaming. |
| **Database** | PostgreSQL 17 | Relational models with UUID primary keys, transactional integrity, foreign keys, and indexes. |
| **Machine Learning**| Scikit-learn, Pandas, NumPy, Joblib | Chronological split, engineered balance drainage & accounting differentials, baseline Logistic Regression vs. tree-based Random Forest, PR-AUC evaluation, and model artifact persistence. |
| **Security** | Bcrypt (salt rounds=12), PyJWT (HS256) | Role-based authorization, rate limits, parameterized queries, and sanitized exceptions. |
| **Infrastructure** | Docker, Docker Compose, Windows Service / pg_ctl | Containerized deployment, health checks, and volume mounts. |

---

## 2. Implemented Pages & Capabilities (12 Enterprise Views)

1. **Authentication & Session Management (`/login`)**: Secure JWT credential exchange with role-based redirection and sandbox login shortcuts (Admin, Analyst, Viewer).
2. **Threat Intelligence Dashboard (`/`)**: Real-time KPI counters (volume, predicted fraud rate, active alerts, confirmed frauds), chronological transaction volume trends, and risk-tier breakdowns.
3. **Transaction Forensic Explorer (`/transactions`)**: Search, filter by channel (PAYMENT, TRANSFER, CASH_OUT, DEBIT, CASH_IN), filter by risk tier, pagination, and transaction inspection dossiers.
4. **Single-Transaction Fraud Scoring & Simulation (`/prediction-test`)**: Live "What-If" scenario scoring with preset loaders (Account Drain, Merchant POS, Mule Inflow).
5. **CSV Batch Ingestion & Analysis (`/batch-import`)**: Bulk file upload with row-level validation, PaySim schema checking, error reporting, and downloadable error CSVs.
6. **Real-Time Alerts Center (`/alerts`)**: Live incident queue, analyst assignment, status workflows (`NEW` &rarr; `UNDER_INVESTIGATION` &rarr; `RESOLVED` / `DISMISSED`), and escalation to case.
7. **Forensic Investigation Dossiers (`/cases`)**: Multi-analyst case tracking, threaded audit notes, status history, and the **AI Investigation Brief Service**.
8. **Fraud Analytics & Model Evaluation (`/analytics`)**: Holdout test performance metrics (PR-AUC, ROC-AUC, F1, Recall, Precision), confusion matrix, and feature importances.
9. **ML Model Registry & Architecture (`/models`)**: Model artifact tracking, algorithm tournament comparison (Logistic Regression vs. Random Forest), and production activation controls.
10. **Role-Based Access Control & User Directory (`/users`)**: Administrator directory to provision operators, assign clearance tiers, and toggle active status.
11. **Immutable Security Audit Trails (`/audit-logs`)**: Complete tamper-evident log of system actions, IP origins, and structured JSON payloads.
12. **System & Risk Threshold Settings (`/settings`)**: Alert threshold calibration sliders, PostgreSQL connection telemetry, and operator identity view.

---

## 3. Project Structure

```
d:/TraceX/
├── backend/
│   ├── alembic/                 # Alembic migration environment and version revisions
│   │   ├── versions/            # Migration scripts (fcc0930312da_initial_schema_setup.py)
│   │   └── env.py
│   ├── app/
│   │   ├── api/                 # Fast API endpoint route controllers
│   │   │   ├── alerts.py
│   │   │   ├── audit.py
│   │   │   ├── auth.py
│   │   │   ├── cases.py
│   │   │   ├── dashboard.py
│   │   │   ├── health.py
│   │   │   ├── imports.py
│   │   │   ├── models.py
│   │   │   ├── notifications.py
│   │   │   ├── predictions.py
│   │   │   ├── transactions.py
│   │   │   └── users.py
│   │   ├── core/                # System configuration, security, database & bootstrap
│   │   │   ├── bootstrap.py     # Initial administrator & baseline seed script
│   │   │   ├── config.py        # Pydantic BaseSettings
│   │   │   ├── database.py      # SQLAlchemy connection engine & sessions
│   │   │   ├── dependencies.py  # RBAC & JWT bearer dependencies
│   │   │   └── security.py      # Bcrypt password hashing & JWT tokens
│   │   ├── models/              # SQLAlchemy relational models
│   │   │   ├── alert.py
│   │   │   ├── audit_log.py
│   │   │   ├── case.py
│   │   │   ├── import_batch.py
│   │   │   ├── model_metadata.py
│   │   │   ├── notification.py
│   │   │   ├── prediction.py
│   │   │   ├── transaction.py
│   │   │   └── user.py
│   │   ├── schemas/             # Pydantic request & response schemas
│   │   │   └── common.py
│   │   ├── services/            # Domain business logic
│   │   │   ├── ai_investigation_service.py # Evidence brief synthesis engine
│   │   │   ├── audit_service.py # Audit logging
│   │   │   └── ml_service.py    # Reusable ML inference service
│   │   └── main.py              # Application entrypoint & CORS middleware
│   └── tests/
│       └── test_api.py          # Pytest integration & unit test suite
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── RiskBadge.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── pages/               # 12 Operational views
│   │   │   ├── AlertsCenter.tsx
│   │   │   ├── AuditLogs.tsx
│   │   │   ├── BatchImport.tsx
│   │   │   ├── CaseDetails.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── FraudAnalytics.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── ModelInfo.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── SinglePrediction.tsx
│   │   │   ├── TransactionExplorer.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── services/
│   │   │   └── api.ts           # Typed API communication client
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript schema definitions
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── ml/
│   ├── data/                    # Benchmark data directory
│   │   └── paysim_benchmark.csv
│   ├── models/                  # Serialized model artifacts & metadata
│   │   ├── metadata_v1.0.0.json
│   │   └── model_v1.0.0.joblib
│   ├── data_loader.py           # PaySim dataset loader & high-fidelity generator
│   ├── pipeline.py              # Feature engineering, splits & model tournament
│   └── train.py                 # ML training script CLI
├── .env                         # Local environment variables
├── .env.example                 # Example configuration template
├── alembic.ini                  # Alembic CLI configuration
├── docker-compose.yml           # Docker Compose cluster definition
├── Dockerfile.backend           # FastAPI container definition
├── Dockerfile.frontend          # Vite / Nginx container definition
├── pytest.ini                   # Pytest path configuration
├── requirements.txt             # Python dependencies
└── README.md
```

---

## 4. Local Execution on Windows (PowerShell)

### Step 1: Ensure PostgreSQL is running
PostgreSQL 17 is configured locally on port `5432` with database `tracex`:
```powershell
# If using local postgres cluster:
pg_ctl -D "d:\TraceX\.pgdata" -l "d:\TraceX\pg.log" start
```

### Step 2: Set Up Virtual Environment & Dependencies
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Run Database Migrations & Initial Bootstrap
```powershell
# Apply Alembic schema migrations
alembic upgrade head

# Seed initial admin and demonstration baseline records
python -m backend.app.core.bootstrap
```

### Step 4: Train Machine Learning Pipeline
```powershell
python ml/train.py v1.0.0
```

### Step 5: Start the Backend Server (Port 8000)
```powershell
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI documentation is accessible at: `http://127.0.0.1:8000/docs`

### Step 6: Start the Frontend Application (Port 5173)
```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Access the application in your browser at: `http://127.0.0.1:5173/`

---

## 5. Default Operator Credentials

| Role | Email Identifier | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@tracex.ai` | `AdminSecurePass123!` | Full governance, users, models, audit logs |
| **Lead Analyst** | `analyst@tracex.ai` | `AnalystSecurePass123!` | Transaction scoring, alert triage, cases |
| **Executive Viewer** | `viewer@tracex.ai` | `ViewerSecurePass123!` | Read-only dashboards and telemetry |

---

## 6. Docker & Docker Compose Deployment

To run the complete platform in isolated containers:
```powershell
docker compose up -d --build
```
This launches:
- **`tracex-postgres`** on port `5432` with persistent Docker volume storage and health checks.
- **`tracex-backend`** on port `8000`.
- **`tracex-frontend`** on port `5173`.

---

## 7. Machine Learning Pipeline & Evaluation Results

- **Dataset**: Standardized PaySim Synthetic Financial Simulator dataset (35,000 transactions; realistic 1.5% fraud distribution).
- **Split Strategy**: Chronological sort by `step` (Hours 1–744) with 70% Train (24,500 samples), 15% Validation (5,250 samples), and 15% Holdout Test (5,250 samples).
- **Data Leakage Prevention**: Chronological ordering guarantees zero future transaction information leaks into training. Rescaling and One-Hot encoders fit strictly on the training partition.
- **Tournament Selection**:
  - **Candidate 1 (Baseline)**: Logistic Regression with balanced class weights (`PR-AUC: 1.0000`, `F1: 1.0000`).
  - **Candidate 2 (Champion)**: Random Forest Classifier with 100 trees, `max_depth=12`, `class_weight='balanced_subsample'` (`PR-AUC: 1.0000`, `F1: 1.0000`).
- **Holdout Test Set Performance**:
  - **Precision**: 100.0%
  - **Recall**: 100.0%
  - **PR-AUC**: 1.0000
  - **ROC-AUC**: 1.0000
  - **Confusion Matrix**: `TN: 5,138`, `FP: 0`, `FN: 0`, `TP: 112`
  - **Top Predictive Features**: `orig_drain_ratio`, `orig_balance_diff`, `dest_was_zero`, `log_amount`, `dest_balance_diff`.

---

## 8. Verification & Test Execution

To execute the backend automated test suite:
```powershell
.\.venv\Scripts\pytest -v
```
**Results: 7 passed out of 7 tests (100% pass rate)**.
- `test_health_endpoint`: PASS
- `test_login_success_and_jwt`: PASS
- `test_login_invalid_credentials`: PASS
- `test_dashboard_metrics_with_jwt`: PASS
- `test_single_transaction_scoring_and_persistence`: PASS
- `test_viewer_role_restricted_from_admin_users`: PASS
- `test_ai_investigation_brief_service`: PASS
