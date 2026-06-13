import api from "./client";

export interface CustomerInvoice {
  id: number;
  invoice_number: string;
  issue_date: string | null;
  due_date: string | null;
  amount: number;
  status: string;
  days_overdue: number;
}

export interface Customer {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  industry: string;
  payment_terms: number;
  invoices_count: number;
  paid_count: number;
  pending_count: number;
  total_billed: number;
  outstanding_amount: number;
  avg_payment_days: number;
  last_invoice_date: string | null;
  risk_level: "Low Risk" | "Medium Risk" | "High Risk" | string;
  payment_performance: string;
  finance_confidence: number;
  invoices: CustomerInvoice[];
}

export interface CustomerStats {
  total_customers: number;
  active_customers: number;
  outstanding_amount: number;
  avg_payment_days: number;
}

export interface CustomersResponse {
  stats: CustomerStats;
  customers: Customer[];
}

export const customerApi = {
  getCustomers: () => api.get<CustomersResponse>("/customers/"),
  createCustomer: (data: {
    company_name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    industry?: string;
    payment_terms?: number;
  }) => api.post<{ message: string; customer_company: string }>("/customers/", data),
  updateCustomer: (companyName: string, data: {
    company_name?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    industry?: string;
    payment_terms?: number;
  }) => api.put<{ message: string }>(`/customers/${encodeURIComponent(companyName)}`, data),
};
