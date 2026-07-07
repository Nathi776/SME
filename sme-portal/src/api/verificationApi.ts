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
  loi_counterparty_known?: boolean | null;
}

export interface CIPCVerificationResult {
  cipc_verified:       boolean | null;  // true=confirmed, false=failed, null=manual review
  auto_approved:       boolean;
  registration_number: string;
  company_name?:       string;
  status?:             string;
  registration_date?:  string;
  source:              string;          // "api" | "pattern_only" | "manual_review"
  message:             string;
  warning?:            string;
  error?:              string;
}

export interface SubmitVerificationResponse extends VerificationRecord {
  bank_statement_parsing?: {
    parsed:            boolean;
    months_analysed?:  number;
    avg_monthly_income?: number;
    avg_monthly_balance?: number;
    overdraft_count?:  number;
    income_regularity?: number;
    parsed_revenue?:   number;
    warning?:          string;
  };
  cipc_verification?: CIPCVerificationResult;
  intent_doc_hint?:   string;
}

export const VerificationApi = {
  /**
   * Upload a verification document.
   *
   * For CIPC uploads, pass cipcRegistrationNumber — it is required by the backend
   * and triggers the auto-verification flow.
   *
   * For all other doc types, cipcRegistrationNumber is ignored.
   */
  submit: (
    docType: string,
    file: File,
    cipcRegistrationNumber?: string,
  ) => {
    const formData = new FormData();
    formData.append("doc_type", docType);
    formData.append("file", file);

    if (docType === "cipc" && cipcRegistrationNumber) {
      formData.append("cipc_registration_number", cipcRegistrationNumber.trim());
    }

    return api.post<SubmitVerificationResponse>("/verifications/submit", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  myVerifications: () => api.get<VerificationRecord[]>("/verifications/my"),

  getCIPCStatus: () =>
    api.get<{
      cipc_registration_number: string | null;
      cipc_verified_at:         string | null;
      cipc_company_name:        string | null;
      cipc_status:              string | null;
      is_verified:              boolean;
    }>("/verifications/cipc-status"),
};
