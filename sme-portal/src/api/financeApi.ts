import api from "./client";

export interface FinanceRequest {
  id: number;
  sme_id: number;
  amount_requested: number;
  approved_amount: number | null;
  fee_rate: number;
  status: string;
  created_at: string;
  approved_at: string | null;
}

export const FinanceApi = {
  apply: (invoiceId: number, amount: number) =>
    api.post<{ message: string; request_id: number; fee_rate: number; status: string }>(
      "/finance/apply",
      {
        invoice_id: invoiceId,
        amount,
      }
    ),

  getRequests: (smeId: number) =>
    api.get<FinanceRequest[]>(`/finance/requests/${smeId}`),

  getPendingRequests: () =>
    api.get<FinanceRequest[]>("/finance/pending"),

  approve: (requestId: number, approvedAmount: number) =>
    api.put<FinanceRequest>(`/finance/approve/${requestId}`, {
      approved_amount: approvedAmount,
    }),

  reject: (requestId: number) =>
    api.put<FinanceRequest>(`/finance/reject/${requestId}`, {}),
};