import React from "react";

const sample = [
  { id: "RQ-001", sme: "Ndlovu Textile", amount: "R150,000", tenor: "30 days" },
  { id: "RQ-002", sme: "Khumalo Foods", amount: "R320,000", tenor: "60 days" },
  { id: "RQ-003", sme: "Zuma Logistics", amount: "R75,000", tenor: "14 days" },
];

export default function PendingFinancingRequests() {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Pending Financing Requests</h3>
      <div className="mt-3 space-y-3">
        {sample.map((r) => (
          <div key={r.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{r.sme}</p>
              <p className="text-xs text-gray-400">{r.id} • {r.tenor}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{r.amount}</p>
              <button className="text-xs text-indigo-600 mt-1">Review</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
