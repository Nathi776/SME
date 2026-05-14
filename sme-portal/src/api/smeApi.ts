import api from "./client";

export interface SME {
  id: number;
  name: string;
  industry: string;
  revenue: number;
  description?: string | null;
}

export interface SMECreate {
  name: string;
  industry: string;
  revenue: number;
  description?: string;
}

export const SMEApi = {
  getAll: () => api.get<SME[]>("/smes"),
  getOne: (id: number) => api.get<SME>(`/smes/${id}`),
  create: (data: SMECreate) => api.post<SME>("/smes", data),
  update: (id: number, data: SMECreate) => api.put<SME>(`/smes/${id}`, data),
  delete: (id: number) => api.delete(`/smes/${id}`),

  getSmeDetails: (id: number) => api.get(`/smes/${id}`),
  getSmeInvoices: (id: number) => api.get(`/invoices/sme/${id}`),

  getCreditScore: (id: number) => api.get(`/credit-scores/sme/${id}`),
  getFinanceRequests: (id: number) => api.get(`/finance/requests/${id}`)
};
