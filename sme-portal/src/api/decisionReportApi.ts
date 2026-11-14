import api from "./client";

export interface ReportFactor {
  name: string;
  description: string;
  points: number;
  max_points: number;
  scored: boolean;
  confidence: string | null;
  confidence_text: string;
  rests_on: string | null;
  notes: string[];
  what_would_help: string | null;
  needs_review: boolean;
}

export interface DecisionReport {
  statement: string;
  headline: {
    decision: string;
    stage: string;
    funding_readiness_score: number;
    viability_score: number | null;
    evidence_confidence_score: number | null;
    scores_explained: Record<string, string>;
  };
  reasoning: string[];
  factors: ReportFactor[];
  strongest_support: string[];
  main_gaps: { name: string; what_would_help: string | null }[];
  context_only: { name: string; description: string }[];
  confidence_note: string;
  evidence_detail_available: boolean;
  traceability: {
    assessed_at: string | null;
    strategy_version: string | null;
    inference_version: string | null;
    evidence_rules_version: string | null;
  };
}

export const DecisionReportApi = {
  mine: () => api.get<DecisionReport>("/decision-reports/me/latest"),
  forSme: (smeId: number | string) => api.get<DecisionReport>(`/decision-reports/sme/${smeId}/latest`),
};
