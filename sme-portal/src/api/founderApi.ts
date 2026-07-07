import api from "./client";

export interface FounderProfile {
  id:         number;
  sme_id:     number;

  // Identity
  id_number?: string | null;

  // Employment & experience
  prior_employer?:            string | null;
  prior_job_title?:           string | null;
  prior_industry?:            string | null;
  years_industry_experience?: number | null;
  prior_business_owner?:      boolean | null;
  prior_business_name?:       string | null;

  // Education
  highest_qualification?: string | null;
  field_of_study?:        string | null;

  // Network & references
  trade_association_member?: boolean | null;
  trade_association_name?:   string | null;
  reference_name?:           string | null;
  reference_company?:        string | null;
  reference_phone?:          string | null;

  created_at?: string | null;
  updated_at?: string | null;
}

export interface FounderScorePreview {
  current_founder_contribution: number;
  max_founder_pts:              number;
  current_total_score:          number;
  potential_gains: Array<{
    action:         string;
    potential_pts:  number;
  }>;
  founder_detail: string[] | null;
}

export const FounderApi = {
  get:     ()                    => api.get<FounderProfile>("/founder/"),
  create:  (data: Partial<FounderProfile>) => api.post<FounderProfile>("/founder/", data),
  update:  (data: Partial<FounderProfile>) => api.put<FounderProfile>("/founder/", data),
  preview: ()                    => api.get<FounderScorePreview>("/founder/score-preview"),
};
