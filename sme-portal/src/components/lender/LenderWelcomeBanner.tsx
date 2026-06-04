import React from "react";
import { Wallet } from "lucide-react";
import type { LenderProfile } from "../../api/lenderApi";
import { formatZAR } from "../../utils/format";

type Props = {
  profile?: LenderProfile | null;
  pendingCount: number;
  totalRequested: number;
  availableSmesCount: number;
};

export default function LenderWelcomeBanner({ profile, pendingCount, totalRequested, availableSmesCount }: Props) {
  const lenderName = profile?.organization_name || "Lender account";
  const lenderEmail = profile?.contact_email || "Connected to your lender profile";
  const lendingLimit = profile?.max_lending_amount ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{lenderName}</h2>
        <p className="text-sm text-gray-500 mt-1">{lenderEmail}</p>
        <p className="text-sm text-gray-500 mt-1">
          {pendingCount} pending request{pendingCount === 1 ? "" : "s"} · {availableSmesCount} SME{availableSmesCount === 1 ? "" : "s"} in view · {formatZAR(totalRequested)} requested
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-sm">
          <p className="text-gray-400 text-xs">Lending Limit</p>
          <p className="font-semibold text-gray-900">{formatZAR(lendingLimit)}</p>
        </div>
        <div className="text-sm">
          <p className="text-gray-400 text-xs">Minimum Credit Score</p>
          <p className="font-semibold text-gray-900">{profile?.min_credit_score ?? "N/A"}</p>
        </div>
        <div className="text-sm">
          <p className="text-gray-400 text-xs">Open Review Queue</p>
          <p className="font-semibold text-gray-900">{pendingCount}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold px-4 py-2 rounded-md gap-2 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Review Pipeline
        </button>
      </div>
    </div>
  );
}
