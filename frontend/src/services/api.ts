import {
  User, Transaction, Alert, InvestigationCase, ImportBatch,
  ModelMetadata, DashboardStats, AuditLog, Notification,
  PaginatedResult, Prediction, AgentExecution, AgentExecutionStats,
  AnalystFeedback
} from '../types';

const API_BASE = '/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('tracex_token');
  }

  public setToken(token: string): void {
    localStorage.setItem('tracex_token', token);
  }

  public clearToken(): void {
    localStorage.removeItem('tracex_token');
    localStorage.removeItem('tracex_user');
  }

  public getCurrentUserStored(): User | null {
    const raw = localStorage.getItem('tracex_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public setCurrentUserStored(user: User): void {
    localStorage.setItem('tracex_user', JSON.stringify(user));
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearToken();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || JSON.stringify(errJson);
      } catch {
        errorMsg = await res.text();
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const data = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    this.setCurrentUserStored(data.user);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      this.clearToken();
    }
  }

  async getMe(): Promise<User> {
    const user = await this.request<User>('/auth/me');
    this.setCurrentUserStored(user);
    return user;
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  // Transactions
  async getTransactions(params: {
    page?: number;
    page_size?: number;
    search?: string;
    tx_type?: string;
    risk_level?: string;
    min_amount?: number;
    max_amount?: number;
  }): Promise<PaginatedResult<Transaction>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.page_size) q.set('page_size', params.page_size.toString());
    if (params.search) q.set('search', params.search);
    if (params.tx_type) q.set('tx_type', params.tx_type);
    if (params.risk_level) q.set('risk_level', params.risk_level);
    if (params.min_amount !== undefined) q.set('min_amount', params.min_amount.toString());
    if (params.max_amount !== undefined) q.set('max_amount', params.max_amount.toString());
    return this.request<PaginatedResult<Transaction>>(`/transactions?${q.toString()}`);
  }

  async getTransaction(id: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${id}`);
  }

  async submitTransaction(data: {
    step: number;
    type: string;
    amount: number;
    name_orig: string;
    oldbalance_org: number;
    newbalance_orig: number;
    name_dest: string;
    oldbalance_dest: number;
    newbalance_dest: number;
    transaction_ref?: string;
  }): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Predictions
  async simulatePrediction(data: any): Promise<any> {
    return this.request('/predictions/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Alerts
  async getAlerts(params: {
    page?: number;
    page_size?: number;
    status?: string;
    severity?: string;
    assigned_to_id?: string;
  }): Promise<PaginatedResult<Alert>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.page_size) q.set('page_size', params.page_size.toString());
    if (params.status) q.set('status', params.status);
    if (params.severity) q.set('severity', params.severity);
    if (params.assigned_to_id) q.set('assigned_to_id', params.assigned_to_id);
    return this.request<PaginatedResult<Alert>>(`/alerts?${q.toString()}`);
  }

  async getAlert(id: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${id}`);
  }

  async updateAlertStatus(id: string, data: {
    status: string;
    resolution_notes?: string;
    assigned_to_id?: string;
  }): Promise<Alert> {
    return this.request<Alert>(`/alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Cases
  async getCases(params: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
  }): Promise<PaginatedResult<InvestigationCase>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.page_size) q.set('page_size', params.page_size.toString());
    if (params.status) q.set('status', params.status);
    if (params.priority) q.set('priority', params.priority);
    return this.request<PaginatedResult<InvestigationCase>>(`/cases?${q.toString()}`);
  }

  async getCase(id: string): Promise<InvestigationCase> {
    return this.request<InvestigationCase>(`/cases/${id}`);
  }

  async createCase(data: {
    title: string;
    description: string;
    priority: string;
    transaction_id?: string;
    alert_id?: string;
    assigned_to_id?: string;
  }): Promise<InvestigationCase> {
    return this.request<InvestigationCase>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCase(id: string, data: {
    status?: string;
    priority?: string;
    assigned_to_id?: string;
    comment?: string;
  }): Promise<InvestigationCase> {
    return this.request<InvestigationCase>(`/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addCaseNote(caseId: string, content: string, evidence_data?: any): Promise<any> {
    return this.request(`/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, evidence_data }),
    });
  }

  async triggerAiCaseBrief(caseId: string): Promise<InvestigationCase> {
    return this.request<InvestigationCase>(`/cases/${caseId}/generate-ai-brief`, {
      method: 'POST',
    });
  }

  // CSV Imports
  async uploadCsv(file: File): Promise<ImportBatch> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<ImportBatch>('/imports/upload-csv', {
      method: 'POST',
      body: formData,
    });
  }

  async getImportBatches(page: number = 1): Promise<PaginatedResult<ImportBatch>> {
    return this.request<PaginatedResult<ImportBatch>>(`/imports/batches?page=${page}`);
  }

  async getImportBatch(id: string): Promise<ImportBatch> {
    return this.request<ImportBatch>(`/imports/batches/${id}`);
  }

  // Models
  async getModels(): Promise<ModelMetadata[]> {
    return this.request<ModelMetadata[]>('/models');
  }

  async getActiveModel(): Promise<ModelMetadata> {
    return this.request<ModelMetadata>('/models/active');
  }

  async activateModel(id: string): Promise<ModelMetadata> {
    return this.request<ModelMetadata>(`/models/${id}/activate`, {
      method: 'POST',
    });
  }

  // Users (Admin)
  async getUsers(page: number = 1, role?: string): Promise<PaginatedResult<User>> {
    const q = new URLSearchParams({ page: page.toString() });
    if (role) q.set('role', role);
    return this.request<PaginatedResult<User>>(`/users?${q.toString()}`);
  }

  async createUser(data: any): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: any): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Audit Logs (Admin)
  async getAuditLogs(page: number = 1, action?: string): Promise<PaginatedResult<AuditLog>> {
    const q = new URLSearchParams({ page: page.toString() });
    if (action) q.set('action', action);
    return this.request<PaginatedResult<AuditLog>>(`/audit-logs?${q.toString()}`);
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<Notification> {
    return this.request<Notification>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  // Phase 2: Agent Executions
  async getAgentExecutions(params: {
    page?: number;
    page_size?: number;
    agent_name?: string;
    status?: string;
  }): Promise<PaginatedResult<AgentExecution>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.page_size) q.set('page_size', params.page_size.toString());
    if (params.agent_name) q.set('agent_name', params.agent_name);
    if (params.status) q.set('status', params.status);
    return this.request<PaginatedResult<AgentExecution>>(`/agents/executions?${q.toString()}`);
  }

  async getAgentExecutionStats(): Promise<AgentExecutionStats> {
    return this.request<AgentExecutionStats>('/agents/executions/stats');
  }

  async runPipeline(transactionId: string): Promise<any> {
    return this.request(`/agents/run-pipeline/${transactionId}`, {
      method: 'POST',
    });
  }

  async triageAlerts(limit: number = 50): Promise<any> {
    return this.request(`/agents/triage-alerts?limit=${limit}`, {
      method: 'POST',
    });
  }

  // Phase 2: Copilot
  async copilotChat(message: string, transactionId?: string, sessionHistory?: any[]): Promise<any> {
    return this.request('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        transaction_id: transactionId,
        session_history: sessionHistory || [],
      }),
    });
  }

  async copilotConfirmAction(action: any): Promise<any> {
    return this.request('/copilot/confirm-action', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // Phase 2: Analyst Feedback
  async submitFeedback(data: {
    transaction_id: string;
    label: string;
    notes?: string;
  }): Promise<AnalystFeedback> {
    return this.request<AnalystFeedback>('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFeedbacks(params: {
    page?: number;
    label?: string;
    transaction_id?: string;
  }): Promise<PaginatedResult<AnalystFeedback>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.label) q.set('label', params.label);
    if (params.transaction_id) q.set('transaction_id', params.transaction_id);
    return this.request<PaginatedResult<AnalystFeedback>>(`/feedback?${q.toString()}`);
  }

  async getFeedbackForTransaction(transactionId: string): Promise<AnalystFeedback[]> {
    return this.request<AnalystFeedback[]>(`/feedback/${transactionId}`);
  }

  // Phase 2: Reports Export
  exportTransactionsUrl(format: string = 'csv', params: Record<string, string> = {}): string {
    const q = new URLSearchParams({ format, ...params });
    return `${API_BASE}/reports/export/transactions?${q.toString()}`;
  }

  exportCasesUrl(format: string = 'csv', params: Record<string, string> = {}): string {
    const q = new URLSearchParams({ format, ...params });
    return `${API_BASE}/reports/export/cases?${q.toString()}`;
  }
}

export const api = new ApiService();

