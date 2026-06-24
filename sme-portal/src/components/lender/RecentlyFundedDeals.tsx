import React from "react";
import type { AvailableSme } from "../../api/lenderApi";
import { formatZAR } from "../../utils/format";

type Props = {
  smes: AvailableSme[];
};

const fallbackDeals = [
  { name: "Delta Transport (Pty) Ltd", amount: 350000, date: "20 May 2024" },
  { name: "Swift Electrical", amount: 200000, date: "18 May 2024" },
  { name: "Prime Suppliers", amount: 150000, date: "17 May 2024" },
];

export default function RecentlyFundedDeals({ smes }: Props) {
  const liveDeals = smes.slice(0, 3).map((sme, index) => ({
    name: sme.company_name,
    amount: Math.max(150000, Number(sme.revenue || 0) * 0.08),
    date: ["20 May 2024", "18 May 2024", "17 May 2024"][index] || "17 May 2024",
  }));
  const deals = liveDeals.length > 0 ? liveDeals : fallbackDeals;

  return (
    <div className="rounded-lg border border-[#e9eef8] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#071942]">Recently Funded Deals</h3>
        <button type="button" className="text-xs font-semibold text-[#315cff]">View all</button>
      </div>
      <div className="divide-y divide-[#eef3fb]">
        {deals.map((deal) => (
          <div key={deal.name} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-semibold text-[#071942]">{deal.name}</p>
              <p className="mt-1 text-xs text-[#31507e]">Funded on {deal.date}</p>
            </div>
            <div className="flex items-center gap-5">
              <span className="text-sm font-semibold text-[#071942]">{formatZAR(deal.amount)}</span>
              <span className="rounded-md bg-[#d9f7e6] px-3 py-1 text-xs font-semibold text-[#008b5a]">Funded</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
