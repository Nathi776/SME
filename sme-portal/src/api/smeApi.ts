import api from "./client";

export interface SME {
  id: number;
  name: string;
  industry: string;
  description?: string;
  owner_id: number;
}

export interface SMECreate {
  name: string;
  industry: string;
  description?: string;
  owner_id: number;
}

export const SMEApi = {
  getAll: () => api.get<SME[]>("/smes"),
  getOne: (id: number) => api.get<SME>(`/smes/${id}`),
  create: (data: SMECreate) => api.post<SME>("/smes", data),
  update: (id: number, data: SMECreate) => api.put<SME>(`/smes/${id}`, data),
  delete: (id: number) => api.delete(`/smes/${id}`),

  getSmeDetails: (id: number) => api.get(`/smes/${id}`),
  getSmeInvoices: (id: number) => api.get(`/smes/${id}/invoices`),

  getCreditScore: (id: number) => api.get(`/smes/${id}/credit-score`),
  getFinanceRequests: (id: number) => api.get(`/smes/${id}/finance-requests`)
};
