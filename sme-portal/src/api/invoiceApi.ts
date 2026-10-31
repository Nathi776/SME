import api from "./client";
import { Invoice, InvoiceCreate } from "../types/invoice";

export const invoiceApi = {
  listBySme: (smeId: number) => api.get<Invoice[]>(`/invoices/sme/${smeId}`),

  // backend returns { message: string, invoice: Invoice }
  create: (data: InvoiceCreate) => api.post<{ message: string; invoice: Invoice }>("/invoices/", data),

  uploadPdf: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ id: number; has_pdf: boolean; pdf_path: string }>(`/invoices/${id}/pdf`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  openPdf: async (id: number) => {
    const res = await api.get<Blob>(`/invoices/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  },

  delete: (id: number) => api.delete(`/invoices/${id}`),
};