import React from "react";

const repayments = [
  { id: "RP-01", sme: "Ndlovu Textile", amount: "R50,000", date: "2024-04-20" },
  { id: "RP-02", sme: "Khumalo Foods", amount: "R20,000", date: "2024-04-18" },
  { id: "RP-03", sme: "Zuma Logistics", amount: "R12,500", date: "2024-04-15" },
];

export default function RecentRepayments() {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Recent Repayments</h3>
      <div className="mt-3 space-y-3">
        {repayments.map((r) => (
          <div key={r.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{r.sme}</p>
              <p className="text-xs text-gray-400">{r.id} • {r.date}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{r.amount}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
