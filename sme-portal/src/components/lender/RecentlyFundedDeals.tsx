import React from "react";

const deals = [
  { id: "FD-01", sme: "Sunrise Farms", amount: "R500,000", fundedOn: "2024-04-12" },
  { id: "FD-02", sme: "Urban Bakers", amount: "R200,000", fundedOn: "2024-04-05" },
  { id: "FD-03", sme: "Blue River Tech", amount: "R1,200,000", fundedOn: "2024-03-18" },
];

export default function RecentlyFundedDeals() {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Recently Funded Deals</h3>
      <div className="mt-3 space-y-3">
        {deals.map((d) => (
          <div key={d.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{d.sme}</p>
              <p className="text-xs text-gray-400">{d.id} • {d.fundedOn}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{d.amount}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
