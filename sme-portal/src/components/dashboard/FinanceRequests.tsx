import { Link } from "react-router-dom";
import { formatZAR } from "../../utils/format";

type FinanceRequest = {
  id: number;
  invoice_id: number;
  invoice_client_name: string | null;
  amount_requested: number | string;
  approved_amount: number | string | null;
  status: string;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  Pending: "bg-[#fff0cf] text-[#f08a00]",
  Approved: "bg-[#cdf5db] text-[#009a65]",
  Paid: "bg-[#cdf5db] text-[#009a65]",
  Funded: "bg-[#cdf5db] text-[#009a65]",
  Rejected: "bg-[#ffe0e0] text-[#df3b3b]",
};

type FinanceRequestsProps = {
  requests: FinanceRequest[];
};

const money = (value: number | string) => formatZAR(value).replace(/\s/g, "");

function requestCode(id: number) {
  return `REQ-2024-${String(id).padStart(3, "0")}`;
}

function invoiceCode(id: number) {
  return `INV-2024-${String(id).padStart(3, "0")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FinanceRequests({ requests }: FinanceRequestsProps) {
  return (
    <div className="flex min-h-[380px] flex-col rounded-lg border border-[#e9eef8] bg-white px-6 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#071942]">Finance Requests</h3>
        <Link to="/finance-requests" className="text-sm font-medium text-[#315cff] hover:underline">View all</Link>
      </div>

      <div className="flex-1">
        {requests.length === 0 ? (
          <p className="border-t border-[#e5ecf7] py-5 text-sm text-[#6d7b99]">No finance requests yet.</p>
        ) : (
          requests.slice(0, 3).map((req) => {
            const status = req.status.charAt(0).toUpperCase() + req.status.slice(1).toLowerCase();
            const amount = money(req.approved_amount ?? req.amount_requested);
            const dateVerb = status === "Pending" ? "Requested" : status;

            return (
              <div key={req.id} className="flex items-start justify-between gap-4 border-t border-[#e5ecf7] py-5">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#071942]">{requestCode(req.id)}</p>
                  <p className="mt-2 truncate text-sm text-[#31456f]">{invoiceCode(req.invoice_id)}</p>
                </div>

                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-8">
                    <p className="text-[15px] font-semibold text-[#071942]">{amount}</p>
                    <span className={`inline-flex min-w-[76px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] ?? statusStyles.Pending}`}>
                      {status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#31456f]">{dateVerb}: {formatDate(req.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
