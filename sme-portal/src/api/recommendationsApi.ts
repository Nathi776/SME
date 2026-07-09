import api from "./client";

export interface FactorStatus {
  factor:      string;
  current_pts: number;
  max_pts:     number;
  pct:         number;
  status:      "Strong" | "Moderate" | "Weak" | "Missing";
  gap_pts:     number;
}

export interface Recommendation {
  priority:      number;
  category:      string;
  action:        string;
  reason:        string;
  impact_pts:    number;
  impact_score:  number;
  difficulty:    "Easy" | "Medium" | "Hard";
  time_estimate: string;
  doc_type:      string | null;
}

export interface RecommendationPlan {
  current_score:      number;
  projected_score:    number;
  decision:           string;
  projected_decision: string;
  summary:            string;
  raw_max:            number;
  factor_statuses:    FactorStatus[];
  recommendations:    Recommendation[];
}

export const RecommendationsApi = {
  get: () => api.get<RecommendationPlan>("/recommendations/"),
};
