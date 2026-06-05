import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { LenderProfile, FinanceRequest } from "../../api/lenderApi";
import { formatZAR } from "../../utils/format";

type Props = {
  profile?: LenderProfile | null;
  pendingRequests: FinanceRequest[];
};

const money = (value: number) => formatZAR(value).replace(/\s/g, "");

export default function PortfolioSummary({ profile, pendingRequests }: Props) {
  const totalPortfolio = profile?.max_lending_amount || 8750000;
  const pendingExposure = pendingRequests.reduce((total, request) => total + Number(request.amount_requested || 0), 0);
  const totalFunded = Math.max(6450000, totalPortfolio - pendingExposure);
  const totalRepaid = 2950000;
  const totalOutstanding = Math.max(3500000, pendingExposure || 3500000);
  const defaulted = 150000;
  const data = [
    { name: "Total Portfolio", value: totalPortfolio, color: "#4f63f6" },
    { name: "Total Funded", value: totalFunded, color: "#2fbf7d" },
    { name: "Total Repaid", value: totalRepaid, color: "#f8b817" },
    { name: "Total Outstanding", value: totalOutstanding, color: "#ff7a00" },
    { name: "Defaulted", value: defaulted, color: "#ef2c2c" },
  ];

  return (
    <div className="rounded-lg border border-[#e9eef8] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#071942]">Portfolio Summary</h3>
        <button type="button" className="rounded border border-[#d8e2f3] px-3 py-1.5 text-xs font-medium text-[#31456f]">This Month</button>
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_190px] md:items-center">
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-3 text-[#31456f]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <span className="font-semibold text-[#071942]">{money(item.value)}</span>
            </div>
          ))}
        </div>
        <div className="relative h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={54} outerRadius={80} paddingAngle={0} dataKey="value" stroke="#ffffff" strokeWidth={1}>
                {data.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-[#071942]">R8.75M</span>
            <span className="text-xs text-[#31456f]">Total Portfolio</span>
          </div>
        </div>
      </div>
    </div>
  );
}
