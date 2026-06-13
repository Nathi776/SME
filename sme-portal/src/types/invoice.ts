export interface Invoice {
  id: number;
  sme_id: number;
  client_name: string;
  description: string | null;
  amount: number;
  status: "draft" | "pending" | "paid" | "overdue" | string;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  currency?: string;
  customer_company?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  customer_industry?: string;
  payment_terms?: number;
  pdf_url?: string;
  created_at?: string;
}

export interface InvoiceCreate {
  client_name: string;
  description?: string;
  amount: number;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  currency?: string;
  customer_company?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  customer_industry?: string;
  payment_terms?: number;
  pdf_url?: string;
}