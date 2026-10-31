import type { FinanceRequest } from "../../api/financeApi";
import { formatZAR } from "../../utils/format";

type Props = { requests: FinanceRequest[] };

/** Shows the business why a lender declined a request, so it can fix the issue or apply elsewhere. */
export default function RejectedRequestsPanel({ requests }: Props) {
  const rejected = requests.filter((r) => r.status === "rejected");
  if (rejected.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5 space-y-3">
      <h3 className="text-sm font-extrabold text-rose-800">Declined requests</h3>
      {rejected.map((r) => (
        <div key={r.id} className="rounded-xl border border-rose-100 bg-white p-4">
          <p className="text-sm font-bold text-[#071942]">
            Request #{r.id} · {formatZAR(Number(r.amount_requested))}
          </p>
          <p className="mt-1 text-sm text-[#31507e]">
            {r.rejection_reason ? r.rejection_reason : "The lender did not give a reason."}
          </p>
        </div>
      ))}
    </div>
  );
}
