import api from "./client";
import { Invoice, InvoiceCreate } from "../types/invoice";

export const invoiceApi = {
  listBySme: (smeId: number) => api.get<Invoice[]>(`/invoices/sme/${smeId}`),

  create: (data: InvoiceCreate) => api.post<Invoice>("/invoices/", data),

  delete: (id: number) => api.delete(`/invoices/${id}`),
};