export interface Invoice {
  id: number;
  sme_id: number;
  client_name: string;
  description: string | null;
  amount: number;
  status: "draft" | "pending" | "paid" | "overdue" | string;
  issue_date?: string;
  due_date?: string;
  created_at?: string;
}

export interface InvoiceCreate {
  client_name: string;
  description?: string;
  amount: number;
}