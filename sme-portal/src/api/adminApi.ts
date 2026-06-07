import api from "./client";

export interface VerificationItem {
  id: number;
  doc_type: string;
  document_url?: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  sme_id?: number;
  lender_id?: number;
}

export const AdminApi = {
  listPendingVerifications: () => api.get<VerificationItem[]>("/verifications/pending"),
  approveVerification: (id: number, notes?: string) => api.put<VerificationItem>(`/verifications/approve/${id}`, { reviewer_notes: notes }),
  rejectVerification: (id: number, notes?: string) => api.put<VerificationItem>(`/verifications/reject/${id}`, { reviewer_notes: notes }),
};
