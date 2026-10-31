import api from "./client";

export interface ConsentPurposeInfo {
  purpose: string;
  description: string;
}

export interface ConsentPolicy {
  policy_version: string;
  purposes: ConsentPurposeInfo[];
}

export interface ConsentState {
  purpose: string;
  description: string;
  granted: boolean;
  decided: boolean;
  policy_version: string | null;
  recorded_at: string | null;
  current_policy_version: string;
}

export interface ConsentHistoryItem {
  purpose: string;
  granted: boolean;
  policy_version: string;
  source: string;
  recorded_at: string;
}

export const MODEL_IMPROVEMENT = "model_improvement";

export const ConsentApi = {
  getPolicy: () => api.get<ConsentPolicy>("/consent/policy"),
  getMine: () => api.get<{ consents: ConsentState[] }>("/consent"),
  set: (purpose: string, granted: boolean) =>
    api.put(`/consent/${purpose}`, { granted }),
  getHistory: () => api.get<ConsentHistoryItem[]>("/consent/history"),
};
