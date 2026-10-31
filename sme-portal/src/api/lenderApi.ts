import api from "./client";
import type { InfoMessage } from "./financeApi";

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
  invoice_id: number | null;
  request_type?: "invoice_backed" | "pre_invoice";
  amount_requested: number;
  approved_amount: number | null;
  fee_rate: number;
  platform_fee: number | null;
  net_amount: number | null;
  status: string;
  lender_id: number | null;
  created_at: string;
  approved_at: string | null;
  purpose_of_funding?: string;
  preferred_payout_date?: string;
  additional_notes?: string;
}

export interface AvailableSme {
  sme_id: number;
  company_name: string;
  industry: string;
  revenue: number;
  credit_score: number | null;
  risk_level: "High" | "Medium" | "Low" | null;
  pending_finance_requests: number;
}

export interface EvidenceDocument {
  doc_type: string;
  status: "approved" | "pending" | "rejected" | string;
  reviewed_at: string | null;
  newer_pending: boolean;
}

export interface SmeIntelligence {
  evidence: {
    documents: EvidenceDocument[];
    funding_readiness: number;
    viability_score: number | null;
    evidence_confidence: number;
  };
  sme: {
    id: number; name: string; industry: string; province: string | null;
    business_city: string | null; revenue: number; years_active: number; cipc_verified: boolean;
  };
  score: {
    current: number;
    decision: string;
    breakdown: Record<string, { label?: string; contribution?: number; max?: number; applicable?: boolean; missing?: string[]; note?: string }>;
  };
  recommendations: { projected_score: number; top_3_actions: { action: string; impact_score: number; difficulty: string }[] };
  score_history: { score: number; created_at: string }[];
  outcomes: { id: number; outcome_status: string; score_at_funding: number | null; amount: number; created_at: string }[];
}

export const LenderApi = {
  getSmeIntelligence: (smeId: number) => api.get<SmeIntelligence>(`/lenders/sme-intelligence/${smeId}`),

  // Profile endpoints
  getProfile: () => api.get<LenderProfile>("/lenders/me"),
  
  updateProfile: (data: Partial<LenderProfile>) =>
    api.put<LenderProfile>("/lenders/me", data),
  register: (data: Partial<LenderProfile>) =>
    api.post<LenderProfile>("/lenders/register", data),

  // SME browsing
  getAvailableSMEs: () => api.get<AvailableSme[]>("/lenders/available-smes"),

  // Finance request management
  getPendingRequests: () =>
    api.get<FinanceRequest[]>("/finance/pending"),

  approveRequest: (requestId: number, approvedAmount: number) =>
    api.put<FinanceRequest>(`/finance/approve/${requestId}`, {
      approved_amount: approvedAmount,
    }),

  getAwaitingInfo: () => api.get<FinanceRequest[]>("/finance/awaiting-info"),

  requestInfo: (requestId: number, message: string) =>
    api.post<FinanceRequest>(`/finance/${requestId}/request-info`, { message }),

  getMessages: (requestId: number) =>
    api.get<InfoMessage[]>(`/finance/${requestId}/messages`),

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
