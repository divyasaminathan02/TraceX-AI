from typing import Generic, TypeVar, List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
import uuid

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

# Auth & User Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)
    role: str = "viewer"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

TokenResponse.update_forward_refs()

# Transaction Schemas
class TransactionCreate(BaseModel):
    step: int = Field(default=1, ge=1, le=744, description="Hour timestamp of transaction (1-744)")
    type: str = Field(description="Transaction type: PAYMENT, TRANSFER, CASH_OUT, DEBIT, CASH_IN")
    amount: float = Field(gt=0, description="Transaction monetary amount")
    name_orig: str = Field(description="Originating customer account ID, e.g. C123456789")
    oldbalance_org: float = Field(ge=0, description="Initial balance before transaction in origination account")
    newbalance_orig: float = Field(ge=0, description="New balance after transaction in origination account")
    name_dest: str = Field(description="Recipient account ID, e.g. M123456789 or C987654321")
    oldbalance_dest: float = Field(ge=0, description="Initial recipient balance before transaction")
    newbalance_dest: float = Field(ge=0, description="New recipient balance after transaction")
    transaction_ref: Optional[str] = None

class PredictionExplanation(BaseModel):
    risk_factors: List[Dict[str, Any]]
    engineered_indicators: Dict[str, Any]

class PredictionResponse(BaseModel):
    id: uuid.UUID
    transaction_id: uuid.UUID
    fraud_probability: float
    risk_level: str
    is_predicted_fraud: bool
    model_version: str
    model_name: str
    explanation: Optional[Dict[str, Any]] = None
    prediction_notice: str
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: uuid.UUID
    transaction_ref: str
    step: int
    type: str
    amount: float
    name_orig: str
    oldbalance_org: float
    newbalance_orig: float
    name_dest: str
    oldbalance_dest: float
    newbalance_dest: float
    is_fraud_actual: Optional[int] = 0
    is_flagged_fraud_actual: Optional[int] = 0
    created_at: datetime
    prediction: Optional[PredictionResponse] = None

    class Config:
        from_attributes = True

# Alert Schemas
class AlertResponse(BaseModel):
    id: uuid.UUID
    transaction_id: uuid.UUID
    prediction_id: uuid.UUID
    severity: str
    status: str
    assigned_to_id: Optional[uuid.UUID] = None
    assigned_to_name: Optional[str] = None
    resolved_by_id: Optional[uuid.UUID] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    transaction: Optional[TransactionResponse] = None
    prediction: Optional[PredictionResponse] = None

    class Config:
        from_attributes = True

class AlertUpdateStatus(BaseModel):
    status: str = Field(description="NEW, UNDER_INVESTIGATION, RESOLVED, DISMISSED")
    resolution_notes: Optional[str] = None
    assigned_to_id: Optional[uuid.UUID] = None

# Case Schemas
class CaseNoteCreate(BaseModel):
    content: str
    evidence_data: Optional[Dict[str, Any]] = None

class CaseNoteResponse(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    author_id: Optional[uuid.UUID] = None
    author_name: Optional[str] = None
    content: str
    evidence_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CaseStatusHistoryResponse(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    changed_by_name: Optional[str] = None
    old_status: str
    new_status: str
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CaseCreate(BaseModel):
    title: str
    description: str
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, URGENT
    transaction_id: Optional[uuid.UUID] = None
    alert_id: Optional[uuid.UUID] = None
    assigned_to_id: Optional[uuid.UUID] = None

class CaseUpdate(BaseModel):
    status: Optional[str] = None # OPEN, IN_PROGRESS, CLOSED_FRAUD, CLOSED_FALSE_POSITIVE
    priority: Optional[str] = None
    assigned_to_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    comment: Optional[str] = None

class CaseResponse(BaseModel):
    id: uuid.UUID
    case_number: str
    title: str
    description: str
    priority: str
    status: str
    transaction_id: Optional[uuid.UUID] = None
    alert_id: Optional[uuid.UUID] = None
    assigned_to_id: Optional[uuid.UUID] = None
    assigned_to_name: Optional[str] = None
    created_by_id: Optional[uuid.UUID] = None
    created_by_name: Optional[str] = None
    ai_investigation_summary: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    notes: List[CaseNoteResponse] = []
    status_history: List[CaseStatusHistoryResponse] = []
    transaction: Optional[TransactionResponse] = None

    class Config:
        from_attributes = True

# Import Batch Schemas
class ImportBatchResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_size_bytes: int
    total_records: int
    processed_records: int
    successful_records: int
    failed_records: int
    status: str
    error_summary: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard Stats Schema
class DashboardStatsResponse(BaseModel):
    total_transactions: int
    flagged_transactions: int
    fraud_rate_percentage: float
    total_alerts: int
    active_alerts: int
    confirmed_fraud_cases: int
    open_cases: int
    model_version: str
    model_status: str # "OPERATIONAL", "DEGRADED", "NOT_LOADED"
    volume_by_day: List[Dict[str, Any]]
    risk_distribution: Dict[str, int]
    type_distribution: Dict[str, int]
    recent_transactions: List[TransactionResponse]
    recent_alerts: List[AlertResponse]

# Model Metadata Schema
class ModelInfoResponse(BaseModel):
    id: uuid.UUID
    version: str
    name: str
    algorithm: str
    hyperparameters: Optional[Dict[str, Any]] = None
    metrics: Dict[str, Any]
    feature_names: List[str]
    training_dataset_size: int
    fraud_count_in_training: int
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Audit Log Schema
class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Notification Schema
class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
