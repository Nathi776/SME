import api from "./client";

export interface LenderProfile {
  id: number;
  user_id: number;
  organization_name: string;
  contact_email: string;
  phone?: string;
  max_lending_amount: number;
  min_credit_score: number;
}

export interface FinanceRequest {
  id: number;
  sme_id: number;
  amount_requested: number;
  approved_amount: number | null;
  fee_rate: number;
  status: string;
  created_at: string;
}

export const LenderApi = {
  // Profile endpoints
  getProfile: () => api.get<LenderProfile>("/lenders/me"),
  
  updateProfile: (data: Partial<LenderProfile>) =>
    api.put<LenderProfile>("/lenders/me", data),

  // SME browsing
  getAvailableSMEs: () =>
    api.get("/lenders/available-smes"),

  // Finance request management
  getPendingRequests: () =>
    api.get<FinanceRequest[]>("/finance/pending"),

  approveRequest: (requestId: number, approvedAmount: number) =>
    api.put<FinanceRequest>(`/finance/approve/${requestId}`, {
      approved_amount: approvedAmount,
    }),

  rejectRequest: (requestId: number) =>
    api.put<FinanceRequest>(`/finance/reject/${requestId}`, {}),

  // SME details
  getSMEDetail: (smeId: number) =>
    api.get(`/smes/${smeId}`),

  getSMEInvoices: (smeId: number) =>
    api.get(`/invoices/sme/${smeId}`),

  getSMECreditScores: (smeId: number) =>
    api.get(`/credit-scores/sme/${smeId}`),
};
