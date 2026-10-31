import React from "react";
import type { FinanceRequest } from "../../api/lenderApi";
import { formatZAR } from "../../utils/format";

type Props = {
  requests: FinanceRequest[];
};

export default function RecentRepayments({ requests }: Props) {
  const repayments = requests
    .filter((request) => request.status === "paid" || request.status === "closed")
    .slice(0, 3)
    .map((request) => ({
      id: request.id,
      name: `Request ${request.id}`,
      amount: Number(request.approved_amount || request.amount_requested || 0),
      date: request.created_at
        ? new Date(request.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
        : "",
    }));

  return (
    <div className="rounded-lg border border-[#e9eef8] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#071942]">Recent Repayments</h3>
        <button type="button" className="text-xs font-semibold text-[#315cff]">View all</button>
      </div>
      {repayments.length === 0 && (
        <p className="py-6 text-center text-sm text-[#31507e]">No repayments recorded yet.</p>
      )}
      <div className="divide-y divide-[#eef3fb]">
        {repayments.map((repayment) => (
          <div key={repayment.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-semibold text-[#071942]">{repayment.name}</p>
              <p className="mt-1 text-xs text-[#31507e]">Request created {repayment.date}</p>
            </div>
            <div className="flex items-center gap-5">
              <span className="text-sm font-semibold text-[#071942]">{formatZAR(repayment.amount)}</span>
              <span className="rounded-md bg-[#d9f7e6] px-3 py-1 text-xs font-semibold text-[#008b5a]">Repaid</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
