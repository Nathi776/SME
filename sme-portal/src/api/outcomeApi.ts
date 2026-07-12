import api from "./client";

export interface FollowedRecommendation {
  category: string;
  action: string;
  doc_type: string | null;
  impact_pts: number;
  impact_score: number;
  followed: boolean;
}

export interface SmeOutcome {
  id: number;
  finance_request_id: number;
  sme_id: number;
  score_at_funding: number;
  amount: number;
  outstanding_recommendations: any[];
  outcome_status: "pending" | "active" | "repaid" | "defaulted";
  check_in_90_due_at:  string | null;
  check_in_180_due_at: string | null;
  check_in_365_due_at: string | null;
  created_at: string;
  updated_at: string;

  checkin_90_completed: boolean;
  checkin_90_date: string | null;
  checkin_90_still_operating: boolean | null;
  checkin_90_revenue: number | null;
  checkin_90_loan_repaid: boolean | null;

  checkin_180_completed: boolean;
  checkin_180_date: string | null;
  checkin_180_still_operating: boolean | null;
  checkin_180_revenue: number | null;
  checkin_180_loan_repaid: boolean | null;

  checkin_365_completed: boolean;
  checkin_365_date: string | null;
  checkin_365_still_operating: boolean | null;
  checkin_365_revenue: number | null;
  checkin_365_loan_repaid: boolean | null;

  followed_recommendations: FollowedRecommendation[];
}

export interface CheckinSubmit {
  interval: number;
  still_operating: boolean;
  revenue: number;
  loan_repaid: boolean;
}

export const OutcomeApi = {
  getHistory: () => api.get<SmeOutcome[]>("/outcomes/history"),
  submitCheckin: (outcomeId: number, data: CheckinSubmit) =>
    api.post<SmeOutcome>(`/outcomes/${outcomeId}/checkin`, data),
};
