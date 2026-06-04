import React from "react";
import type { LenderProfile, FinanceRequest } from "../../api/lenderApi";
import { formatZAR } from "../../utils/format";

type Props = {
  profile?: LenderProfile | null;
  pendingRequests: FinanceRequest[];
};

export default function PortfolioSummary({ profile, pendingRequests }: Props) {
  const outstandingAmount = pendingRequests.reduce((total, request) => total + Number(request.amount_requested || 0), 0);

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Portfolio Summary</h3>
      <div className="mt-3">
        <p className="text-sm text-gray-500">Configured Lending Limit: <span className="font-semibold text-gray-900">{formatZAR(profile?.max_lending_amount ?? 0)}</span></p>
        <p className="text-sm text-gray-500">Pending Exposure: <span className="font-semibold text-gray-900">{formatZAR(outstandingAmount)}</span></p>
        <p className="text-sm text-gray-500">Minimum Credit Score: <span className="font-semibold text-gray-900">{profile?.min_credit_score ?? "N/A"}</span></p>
      </div>
    </div>
  );
}
