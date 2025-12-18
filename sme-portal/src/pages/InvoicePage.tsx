import { useEffect, useState } from "react";
import { Invoice, InvoiceApi, InvoiceCreate } from "../api/invoiceApi";

function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [form, setForm] = useState<InvoiceCreate>({
    sme_id: 1,
    amount: 0,
    due_date: "",
    status: "pending",
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const res = await InvoiceApi.getAll();
      setInvoices(res.data);
    } catch (error) {
      console.error("Error loading invoices", error);
    }
  };

  const createInvoice = async () => {
    try {
      await InvoiceApi.create(form);
      setForm({ sme_id: 1, amount: 0, due_date: "", status: "pending" });
      loadInvoices();
    } catch (error) {
      console.error("Error creating invoice", error);
    }
  };

  const deleteInvoice = async (id: number) => {
    try {
      await InvoiceApi.delete(id);
      loadInvoices();
    } catch (error) {
      console.error("Error deleting invoice", error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Invoice Management</h1>

      <h2>Create Invoice</h2>

      <div>
        <input
          type="number"
          placeholder="SME ID"
          value={form.sme_id}
          onChange={(e) => setForm({ ...form, sme_id: Number(e.target.value) })}
        />

        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
        />

        <input
          type="date"
          placeholder="Due Date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />

        <input
          placeholder="Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        />

        <button onClick={createInvoice}>Create Invoice</button>
      </div>

      <h2>Invoice List</h2>
      {invoices.map((inv) => (
        <div
          key={inv.id}
          style={{
            border: "1px solid gray",
            padding: 10,
            marginBottom: 10,
            borderRadius: 4,
          }}
        >
          <p>
            <strong>Invoice #{inv.id}</strong>
          </p>
          <p>SME: {inv.sme_id}</p>
          <p>Amount: {inv.amount}</p>
          <p>Due: {inv.due_date}</p>
          <p>Status: {inv.status}</p>
          <button onClick={() => deleteInvoice(inv.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default InvoicePage;
