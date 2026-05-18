import api from "./client";
import { Invoice, InvoiceCreate } from "../types/invoice";

export const invoiceApi = {
  listBySme: (smeId: number) => api.get<Invoice[]>(`/invoices/sme/${smeId}`),

  // backend returns { message: string, invoice: Invoice }
  create: (data: InvoiceCreate) => api.post<{ message: string; invoice: Invoice }>("/invoices/", data),

  delete: (id: number) => api.delete(`/invoices/${id}`),
};