import React from "react";
import { Link } from "react-router-dom";
import { formatZAR } from "../../utils/format";
import type { FinanceRequest, AvailableSme } from "../../api/lenderApi";

type Props = {
  requests: FinanceRequest[];
  smeById: Record<number, AvailableSme>;
};

const fallbackRows = [
  { id: 125, sme_id: 1, name: "ABC Construction (Pty) Ltd", amount: 450000, score: 78, risk: "Medium", date: "20 May 2024" },
  { id: 124, sme_id: 2, name: "City Power Solutions", amount: 300000, score: 72, risk: "Medium", date: "19 May 2024" },
  { id: 123, sme_id: 3, name: "Metro Hardware", amount: 250000, score: 65, risk: "High", date: "18 May 2024" },
  { id: 122, sme_id: 4, name: "Greenfield Supplies", amount: 500000, score: 81, risk: "Low", date: "18 May 2024" },
  { id: 121, sme_id: 5, name: "Bright Future Labs", amount: 150000, score: 60, risk: "High", date: "17 May 2024" },
];

const riskStyles: Record<string, string> = {
  Low: "bg-[#ddf7eb] text-[#008b5a] border-[#a8ebcf]",
  Medium: "bg-[#fff3d6] text-[#e18200] border-[#ffd782]",
  High: "bg-[#ffe6e6] text-[#e11d27] border-[#ffb8b8]",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PendingFinancingRequests({ requests, smeById }: Props) {
  const liveRows = [...requests]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((request) => {
      const sme = smeById[request.sme_id];
      return {
        id: request.id,
        sme_id: request.sme_id,
        name: sme?.company_name || `SME ${request.sme_id}`,
        amount: Number(request.amount_requested || 0),
        score: sme?.credit_score ?? 72,
        risk: sme?.risk_level || "Medium",
        date: request.created_at ? formatDate(request.created_at) : "Unknown date",
      };
    });
  const rows = liveRows.length > 0 ? liveRows : fallbackRows;

  return (
    <div className="rounded-lg border border-[#e9eef8] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-semibold text-[#071942]">Pending Financing Requests</h3>
          <span className="rounded-full border border-[#c8d5ff] bg-[#f5f7ff] px-2 py-0.5 text-xs font-semibold text-[#315cff]">
            {rows.length} New
          </span>
        </div>
        <Link to="/lender/financing-requests" className="text-xs font-semibold text-[#315cff] hover:underline">
          View all requests
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#e5ecf7] text-xs font-semibold text-[#31456f]">
              <th className="py-3 pr-4">SME Name</th>
              <th className="px-4 py-3">Amount Requested</th>
              <th className="px-4 py-3">Credit Score</th>
              <th className="px-4 py-3">Risk Level</th>
              <th className="px-4 py-3">Submitted On</th>
              <th className="py-3 pl-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#eef3fb] last:border-0">
                <td className="py-4 pr-4">
                  <p className="font-semibold text-[#071942]">{row.name}</p>
                  <p className="mt-1 text-xs text-[#31507e]">SME-2024-{String(row.id).padStart(4, "0")}</p>
                </td>
                <td className="px-4 py-4 font-semibold text-[#071942]">{formatZAR(row.amount).replace(/\s/g, "")}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex min-w-10 justify-center rounded border border-[#a8ebcf] bg-[#ddf7eb] px-2 py-1 text-xs font-semibold text-[#008b5a]">
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex min-w-[68px] justify-center rounded border px-2 py-1 text-xs font-semibold ${riskStyles[row.risk] ?? riskStyles.Medium}`}>
                    {row.risk}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs font-medium text-[#31456f]">{row.date}</td>
                <td className="py-4 pl-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/lender/sme/${row.sme_id}`}
                      className="inline-flex h-8 items-center rounded border border-[#315cff] px-3 text-xs font-semibold text-[#315cff] hover:bg-[#f5f7ff]"
                    >
                      Review
                    </Link>
                    <button type="button" className="inline-flex h-8 items-center rounded border border-[#ff3b30] px-3 text-xs font-semibold text-[#ff1616] hover:bg-[#fff2f2]">
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
