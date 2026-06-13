import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, FileText, Calendar, Clock } from "lucide-react";
import api from "../api/client";
import { invoiceApi } from "../api/invoiceApi";
import { formatZAR } from "../utils/format";
import { useSnackbar } from "notistack";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const dash = await api.get("/smes/dashboard");
      const smeId = dash.data.sme_id;
      const res = await invoiceApi.listBySme(smeId);
      setInvoices(res.data);
    } catch (err) {
      console.error("Failed to load invoices", err);
      enqueueSnackbar("Failed to load invoices", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const deleteInvoice = async (id: number) => {
    try {
      await invoiceApi.delete(id);
      enqueueSnackbar("Invoice deleted successfully", { variant: "success" });
      loadInvoices();
    } catch (err) {
      enqueueSnackbar("Failed to delete invoice", { variant: "error" });
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    return (
      inv.client_name?.toLowerCase().includes(query) ||
      inv.invoice_number?.toLowerCase().includes(query) ||
      inv.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 pb-8 text-[#071942]">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Invoices</h1>
          <p className="text-sm text-[#5f6d8a] mt-1">
            Create, manage, and track your business customer invoices.
          </p>
        </div>
        <button
          onClick={() => navigate("/invoices/upload")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f724f] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition-all hover:bg-[#165339] hover:shadow-emerald-950/20 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Upload New Invoice
        </button>
      </div>

      {/* Main List Container */}
      <div className="rounded-2xl border border-[#e9eef8] bg-white shadow-sm overflow-hidden">
        {/* Search and filter bar */}
        <div className="p-5 border-b border-[#e9eef8] flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#91a1bf]" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#dfe5f0] bg-white py-2.5 pl-10 pr-4 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
            />
          </div>
          <div className="text-xs text-[#5f6d8a] font-medium self-end sm:self-auto">
            Showing {filteredInvoices.length} invoices
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-sm text-[#5f6d8a]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f724f] border-t-transparent"></div>
            Loading invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#1f724f] mb-4">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#071942]">No invoices found</h3>
            <p className="mt-1 text-sm text-[#5f6d8a] max-w-sm">
              {searchQuery ? "No invoices match your search term. Try another query." : "You haven't uploaded any invoices yet. Create your first invoice to get started."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate("/invoices/upload")}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#071942] hover:bg-[#f8fafd]"
              >
                Upload Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#f8fafc] text-xs font-semibold uppercase tracking-wider text-[#5f6d8a]">
                  <th className="px-6 py-4">Invoice details</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9eef8] text-sm text-[#071942]">
                {filteredInvoices.map((inv) => {
                  const issueStr = inv.issue_date
                    ? new Date(inv.issue_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
                    : inv.created_at
                    ? new Date(inv.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
                    : "-";
                  const dueStr = inv.due_date
                    ? new Date(inv.due_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
                    : "-";

                  return (
                    <tr key={inv.id} className="hover:bg-[#fbfcfe]/50 transition-colors">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf0fb] text-[#1f724f] border border-emerald-100">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-[#071942]">{inv.invoice_number || `INV-2026-${String(inv.id).padStart(3, "0")}`}</p>
                            <p className="text-xs text-[#5f6d8a] truncate max-w-[200px] mt-0.5">{inv.description || "No description"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 font-medium">
                        {inv.client_name}
                      </td>
                      <td className="px-6 py-4.5 font-bold text-[#071942]">
                        {formatZAR(inv.amount)}
                      </td>
                      <td className="px-6 py-4.5 text-xs text-[#5f6d8a]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#91a1bf]" />
                          <span>Issued: {issueStr}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5 text-[#91a1bf]" />
                          <span>Due: {dueStr}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            inv.status === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : inv.status === "overdue"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              inv.status === "paid"
                                ? "bg-emerald-500"
                                : inv.status === "overdue"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {inv.status === "paid" ? "Paid" : inv.status === "overdue" ? "Overdue" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
