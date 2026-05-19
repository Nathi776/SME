import { Link } from "react-router-dom";
import { formatZAR } from "../../utils/format";

type FinanceRequest = {
  id: number;
  invoice_id: number;
  invoice_client_name: string | null;
  amount_requested: number;
  approved_amount: number | null;
  status: string;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Paid: "bg-blue-100 text-blue-700 border-blue-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

type FinanceRequestsProps = {
  requests: FinanceRequest[];
};

export default function FinanceRequests({ requests }: FinanceRequestsProps) {
  const items = requests;

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">Finance Requests</h3>
        <Link to="/finance-requests" className="text-xs text-[#2F6BFF] hover:underline font-medium">View all</Link>
      </div>

      <div className="space-y-3 flex-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No finance requests yet.</p>
        ) : (
          items.map((req) => {
          const status = req.status.charAt(0).toUpperCase() + req.status.slice(1);
          const amount = formatZAR(req.approved_amount ?? req.amount_requested);
          const date = new Date(req.created_at).toLocaleDateString("en-ZA");

          return (
            <div key={req.id} className="flex items-start justify-between py-3 border-b last:border-0 border-gray-100">
              <div>
                <p className="text-sm font-semibold text-foreground">REQ-{req.id}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{req.invoice_client_name ?? `Invoice #${req.invoice_id}`}</p>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-3 justify-end">
                  <p className="text-sm font-semibold text-foreground">{amount}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                    {status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{date}</p>
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
