import api from "./client";
import axios from "axios";

const API = "http://localhost:8000";

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

export const InvoiceAPI = {
  create: (data: any) =>
    axios.post(`${API}/invoices`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }),

  getAll: () =>
    axios.get(`${API}/invoices`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }),

  delete: (id: number) =>
    axios.delete(`${API}/invoices/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }),
};