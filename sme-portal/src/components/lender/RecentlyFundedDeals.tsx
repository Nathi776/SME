import React from "react";
import type { AvailableSme } from "../../api/lenderApi";

type Props = {
  smes: AvailableSme[];
};

export default function RecentlyFundedDeals({ smes }: Props) {
  const items = [...smes].sort((a, b) => b.pending_finance_requests - a.pending_finance_requests).slice(0, 3);

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">SMEs on Your Radar</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No SME records were returned from the database.</p>
        ) : (
          items.map((sme) => (
            <div key={sme.sme_id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{sme.company_name}</p>
                <p className="text-xs text-gray-400">
                  {sme.industry} • {sme.risk_level ?? "Unknown risk"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{sme.pending_finance_requests} open</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
