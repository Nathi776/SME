import React from "react";
import { Link } from "react-router-dom";
import { formatZAR } from "../../utils/format";
import type { FinanceRequest, AvailableSme } from "../../api/lenderApi";

type Props = {
  requests: FinanceRequest[];
  smeById: Record<number, AvailableSme>;
};

export default function PendingFinancingRequests({ requests, smeById }: Props) {
  const items = [...requests].sort((a, b) => Number(b.created_at.localeCompare(a.created_at)));

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Pending Financing Requests</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No pending requests found for this lender.</p>
        ) : (
          items.map((request) => {
            const sme = smeById[request.sme_id];
            const requestLabel = `RQ-${String(request.id).padStart(4, "0")}`;

            return (
              <div key={request.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{sme?.company_name || `SME ${request.sme_id}`}</p>
                  <p className="text-xs text-gray-400">
                    {requestLabel} • {request.status} • {request.created_at ? new Date(request.created_at).toLocaleDateString("en-ZA") : "Unknown date"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatZAR(request.amount_requested)}</p>
                  <Link className="text-xs text-indigo-600 mt-1 inline-block" to={`/lender/sme/${request.sme_id}`}>
                    Review
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
