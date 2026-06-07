import api from "./client";

export interface VerificationRecord {
  id: number;
  doc_type: string;
  document_url?: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  sme_id?: number | null;
  lender_id?: number | null;
}

export interface VerificationSubmitPayload {
  doc_type: string;
  document_url?: string;
}

export const VerificationApi = {
  submit: (data: VerificationSubmitPayload) => api.post<VerificationRecord>("/verifications/submit", data),
  myVerifications: () => api.get<VerificationRecord[]>("/verifications/my"),
};
