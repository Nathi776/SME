import { Link } from "react-router-dom";
import { formatZAR } from "../../utils/format";

type RecentInvoice = {
  id: number;
  client_name: string;
  amount: number | string;
  status: string | null;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  paid: "bg-[#cdf5db] text-[#009a65]",
  pending: "bg-[#fff0cf] text-[#f08a00]",
  unpaid: "bg-[#fff0cf] text-[#f08a00]",
  overdue: "bg-[#ffe0e0] text-[#df3b3b]",
  draft: "bg-[#eef3fb] text-[#5c6f91]",
};

type RecentInvoicesProps = {
  invoices: RecentInvoice[];
};

const money = (value: number | string) => formatZAR(value).replace(/\s/g, "");

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function invoiceCode(id: number) {
  return `INV-2024-${String(id).padStart(3, "0")}`;
}

export default function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <div className="flex min-h-[380px] flex-col rounded-2xl border border-[#e9eef8] bg-white px-6 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#071942]">Recent Invoices</h3>
        <Link to="/invoices" className="text-sm font-medium text-[#315cff] hover:underline">View all</Link>
      </div>
      <div className="flex-1">
        {invoices.length === 0 ? (
          <p className="border-t border-[#e5ecf7] py-5 text-sm text-[#6d7b99]">No invoices yet.</p>
        ) : (
          invoices.slice(0, 4).map((inv) => {
            const rawStatus = (inv.status || "draft").toLowerCase();
            const status = rawStatus === "pending" ? "unpaid" : rawStatus;
            const label = status.charAt(0).toUpperCase() + status.slice(1);
            const dateLabel = status === "paid" ? "Paid" : "Due";

            return (
              <div key={inv.id} className="flex items-start justify-between gap-4 border-t border-[#eef6ff] py-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#071942]">{invoiceCode(inv.id)}</p>
                  <p className="mt-2 truncate text-sm text-[#31456f]">{inv.client_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-8">
                    <p className="text-[15px] font-semibold text-[#071942]">{money(inv.amount)}</p>
                    <span className={`inline-flex min-w-[58px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] ?? statusStyles.draft}`}>
                      {label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#31456f]">{dateLabel}: {formatDate(inv.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
