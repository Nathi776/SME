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

export const VerificationApi = {
  submit: (docType: string, file: File) => {
    const formData = new FormData();
    formData.append("doc_type", docType);
    formData.append("file", file);
    return api.post<VerificationRecord>("/verifications/submit", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  myVerifications: () => api.get<VerificationRecord[]>("/verifications/my"),
};
