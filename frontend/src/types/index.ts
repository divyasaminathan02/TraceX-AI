export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PredictionExplanation {
  risk_factors: Array<{
    factor: string;
    severity: string;
    description: string;
  }>;
  engineered_indicators: {
    orig_drain_ratio: number;
    orig_balance_diff: number;
    dest_balance_diff: number;
    hour_of_day: number;
  };
}

export interface Prediction {
  id: string;
  transaction_id: string;
  fraud_probability: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_predicted_fraud: boolean;
  model_version: string;
  model_name: string;
  explanation?: PredictionExplanation;
  prediction_notice: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  transaction_ref: string;
  step: number;
  type: string;
  amount: number;
  name_orig: string;
  oldbalance_org: number;
  newbalance_orig: number;
  name_dest: string;
  oldbalance_dest: number;
  newbalance_dest: number;
  is_fraud_actual?: number;
  is_flagged_fraud_actual?: number;
  created_at: string;
  prediction?: Prediction;
}

export interface Alert {
  id: string;
  transaction_id: string;
  prediction_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';
  assigned_to_id?: string;
  assigned_to_name?: string;
  resolved_by_id?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  transaction?: Transaction;
  prediction?: Prediction;
}

export interface CaseNote {
  id: string;
  case_id: string;
  author_id?: string;
  author_name?: string;
  content: string;
  evidence_data?: any;
  created_at: string;
}

export interface CaseStatusHistory {
  id: string;
  case_id: string;
  changed_by_name?: string;
  old_status: string;
  new_status: string;
  comment?: string;
  created_at: string;
}

export interface InvestigationCase {
  id: string;
  case_number: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED_FRAUD' | 'CLOSED_FALSE_POSITIVE';
  transaction_id?: string;
  alert_id?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  created_by_id?: string;
  created_by_name?: string;
  ai_investigation_summary?: {
    generated_at: string;
    service_engine: string;
    summary: string;
    evidence_points: string[];
    observed_anomalies: Array<{
      category: string;
      finding: string;
      significance: string;
    }>;
    model_signals: {
      model_version: string;
      fraud_probability: number;
      assigned_risk_tier: string;
      model_confidence_flag: boolean;
    };
    recommended_actions: Array<{
      step: string;
      urgency: string;
      guidance: string;
    }>;
    disclaimer: string;
  };
  created_at: string;
  updated_at: string;
  notes: CaseNote[];
  status_history: CaseStatusHistory[];
  transaction?: Transaction;
}

export interface ImportBatch {
  id: string;
  filename: string;
  file_size_bytes: number;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  status: string;
  error_summary?: Array<{
    row: number;
    error: string;
    data: any;
  }>;
  created_at: string;
}

export interface ModelMetadata {
  id: string;
  version: string;
  name: string;
  algorithm: string;
  hyperparameters?: any;
  metrics: {
    model_name: string;
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    pr_auc: number;
    confusion_matrix: {
      tn: number;
      fp: number;
      fn: number;
      tp: number;
    };
    fraud_class_metrics: {
      fraud_count: number;
      detected_frauds: number;
      missed_frauds: number;
      false_alarms: number;
    };
    validation_metrics?: any;
    test_metrics?: any;
    comparison?: any;
    feature_importance?: Record<string, number>;
    synthetic_data_disclaimer?: string;
  };
  feature_names: string[];
  training_dataset_size: number;
  fraud_count_in_training: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  total_transactions: number;
  flagged_transactions: number;
  fraud_rate_percentage: number;
  total_alerts: number;
  active_alerts: number;
  confirmed_fraud_cases: number;
  open_cases: number;
  model_version: string;
  model_status: string;
  volume_by_day: Array<{
    date: string;
    transactions: number;
    volume: number;
  }>;
  risk_distribution: Record<string, number>;
  type_distribution: Record<string, number>;
  recent_transactions: Transaction[];
  recent_alerts: Alert[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Phase 2 Types

export interface AgentExecution {
  id: string;
  agent_name: string;
  agent_version: string;
  task_type: string;
  record_id?: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMED_OUT';
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  outcome_summary?: string;
  error_category?: string;
  retry_count: number;
  created_at: string;
}

export interface AgentExecutionStats {
  total_executions: number;
  successful: number;
  failed: number;
  success_rate: number;
  avg_duration_ms: number;
  by_agent: Array<{
    agent_name: string;
    count: number;
    avg_duration_ms: number;
  }>;
}

export interface AnalystFeedback {
  id: string;
  transaction_id: string;
  analyst_id?: string;
  label: 'CONFIRMED_FRAUD' | 'LEGITIMATE' | 'NEEDS_FURTHER_REVIEW';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_called?: string;
  tool_result?: any;
  requires_confirmation?: boolean;
  pending_action?: any;
  blocked?: boolean;
  timestamp: string;
}

export interface PrioritizedAlert {
  alert_id: string;
  transaction_id: string;
  transaction_ref: string;
  amount: number;
  tx_type: string;
  severity: string;
  status: string;
  fraud_probability: number;
  priority_score: number;
  analyst_override?: string;
  triage_tier: string;
  rank: number;
  created_at?: string;
}
