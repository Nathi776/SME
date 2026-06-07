import api from "./client";

export interface DashboardInvoiceItem {
  id: number;
  client_name: string;
  amount: number;
  status: string | null;
  created_at: string;
}

export interface DashboardFinanceRequestItem {
  id: number;
  invoice_id: number;
  invoice_client_name: string | null;
  amount_requested: number;
  approved_amount: number | null;
  status: string;
  created_at: string;
}

export interface DashboardActivityItem {
  kind: string;
  text: string;
  created_at: string;
}

export interface DashboardResponse {
  sme_id: number;
  sme_name: string;
  industry: string;
  revenue: number;
  username: string;
  invoice_count: number;
  outstanding_balance: number;
  credit_score: number | null;
  finance_requests: number;
  funded_amount: number;
  eligible_amount: number;
  requested_amount: number;
  approved_amount: number;
  recent_invoices: DashboardInvoiceItem[];
  recent_finance_requests: DashboardFinanceRequestItem[];
  recent_activity: DashboardActivityItem[];
}

export interface SME {
  id: number;
  name: string;
  industry: string;
  revenue: number;
  years_active?: number;
  description?: string | null;
}

export interface SMECreate {
  name: string;
  industry: string;
  revenue: number;
  years_active?: number;
  description?: string;
}

export const SMEApi = {
  getAll: () => api.get<SME[]>("/smes"),
  getOne: (id: number) => api.get<SME>(`/smes/${id}`),
  create: (data: SMECreate) => api.post<SME>("/smes", data),
  update: (id: number, data: SMECreate) => api.put<SME>(`/smes/${id}`, data),
  delete: (id: number) => api.delete(`/smes/${id}`),

  getDashboard: () => api.get<DashboardResponse>("/smes/dashboard"),

  getSmeDetails: (id: number) => api.get(`/smes/${id}`),
  getSmeInvoices: (id: number) => api.get(`/invoices/sme/${id}`),

  getCreditScore: (id: number) => api.get(`/credit-scores/sme/${id}`),
  getCreditDecision: (id: number) => api.get(`/credit-scores/decision/${id}`),
  getCreditScoreDetails: (id: number) => api.get(`/credit-scores/details/${id}`),
  getFinanceRequests: (id: number) => api.get(`/finance/requests/${id}`)
  ,
  calculateCreditScore: (id: number) => api.post(`/credit-scores/calculate/${id}`),
};
