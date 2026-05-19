import { Link } from "react-router-dom";
import { formatZAR } from "../../utils/format";

type RecentInvoice = {
  id: number;
  client_name: string;
  amount: number;
  status: string | null;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-orange-100 text-orange-700 border-orange-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
};

type RecentInvoicesProps = {
  invoices: RecentInvoice[];
};

export default function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">Recent Invoices</h3>
        <Link to="/invoices" className="text-xs text-[#2F6BFF] hover:underline font-medium">View all</Link>
      </div>
      <div className="space-y-3 flex-1">
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          invoices.map((inv) => {
            const status = (inv.status || "draft").toLowerCase();

            return (
              <div key={inv.id} className="flex items-start justify-between py-3 border-b last:border-0 border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-foreground">INV-{inv.id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{inv.client_name}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3 justify-end">
                    <p className="text-sm font-semibold text-foreground">{formatZAR(inv.amount)}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Created: {new Date(inv.created_at).toLocaleDateString("en-ZA")}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
