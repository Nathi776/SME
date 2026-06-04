import React from "react";
import type { FinanceRequest } from "../../api/lenderApi";
import { formatZAR } from "../../utils/format";

type Props = {
  requests: FinanceRequest[];
};

export default function RecentRepayments({ requests }: Props) {
  const items = [...requests].sort((a, b) => Number(b.created_at.localeCompare(a.created_at))).slice(0, 3);

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Latest Request Activity</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No recent financing activity is available yet.</p>
        ) : (
          items.map((request) => (
            <div key={request.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Request {request.id}</p>
                <p className="text-xs text-gray-400">
                  {request.status} • {request.created_at ? new Date(request.created_at).toLocaleDateString("en-ZA") : "Unknown date"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatZAR(request.amount_requested)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
