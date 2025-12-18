import api from "./client";

export interface Invoice {
  id: number;
  sme_id: number;
  amount: number;
  due_date: string;
  status: string;
}

export interface InvoiceCreate {
  sme_id: number;
  amount: number;
  due_date: string;
  status?: string;
}

export const InvoiceApi = {
  getAll: () => api.get<Invoice[]>("/invoices"),
  getOne: (id: number) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: InvoiceCreate) => api.post("/invoices", data),
  update: (id: number, data: InvoiceCreate) => api.put(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
};
