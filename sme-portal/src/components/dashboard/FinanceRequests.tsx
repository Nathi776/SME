import { Link } from "react-router-dom";

type FinanceRequest = {
  id: string;
  ref?: string;
  invoice_ref?: string;
  amount?: string;
  amount_requested?: number | string;
  status?: "Pending" | "Approved" | "Funded" | string;
  date?: string;
  requested_at?: string;
};

const defaultRequests: FinanceRequest[] = [
  { id: "REQ-2024-015", ref: "INV-2024-024", amount: "R54,800.00", status: "Pending", date: "Requested: 20 May 2024" },
  { id: "REQ-2024-014", ref: "INV-2024-020", amount: "R40,000.00", status: "Approved", date: "Approved: 18 May 2024" },
  { id: "REQ-2024-013", ref: "INV-2024-018", amount: "R55,000.00", status: "Funded", date: "Funded: 15 May 2024" },
];

const statusStyles: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Funded: "bg-blue-100 text-blue-700 border-blue-200",
};

type FinanceRequestsProps = {
  requests?: FinanceRequest[];
};

export default function FinanceRequests({ requests = defaultRequests }: FinanceRequestsProps) {
  const items = requests.length > 0 ? requests : defaultRequests;

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">Finance Requests</h3>
        <Link to="/finance-requests" className="text-xs text-blue-600 hover:underline font-medium">
          View all
        </Link>
      </div>

      <div className="space-y-3 flex-1">
        {items.map((req) => {
          const status = req.status ?? "Pending";
          const amount = req.amount ?? `R${req.amount_requested ?? 0}`;
          const date = req.date ?? req.requested_at ?? "";

          return (
            <div key={req.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-semibold text-foreground">{req.id}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{req.ref ?? req.invoice_ref}</p>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm font-semibold text-foreground">{amount}</p>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusStyles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
