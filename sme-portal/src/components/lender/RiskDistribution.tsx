import React from "react";
import type { AvailableSme } from "../../api/lenderApi";

type Props = {
  smes: AvailableSme[];
};

const fallback = [
  { label: "Low Risk", amount: "40% (R3.5M)", percent: 40, color: "#2fbf7d" },
  { label: "Medium Risk", amount: "35% (R3.1M)", percent: 35, color: "#f8b817" },
  { label: "High Risk", amount: "20% (R1.75M)", percent: 20, color: "#ff7a00" },
  { label: "Defaulted", amount: "5% (R0.4M)", percent: 5, color: "#ef2c2c" },
];

export default function RiskDistribution({ smes }: Props) {
  const total = Math.max(smes.length, 1);
  const rows =
    smes.length > 0
      ? [
          { label: "Low Risk", amount: `${Math.round((smes.filter((sme) => sme.risk_level === "Low").length / total) * 100)}%`, percent: Math.round((smes.filter((sme) => sme.risk_level === "Low").length / total) * 100), color: "#2fbf7d" },
          { label: "Medium Risk", amount: `${Math.round((smes.filter((sme) => sme.risk_level === "Medium").length / total) * 100)}%`, percent: Math.round((smes.filter((sme) => sme.risk_level === "Medium").length / total) * 100), color: "#f8b817" },
          { label: "High Risk", amount: `${Math.round((smes.filter((sme) => sme.risk_level === "High").length / total) * 100)}%`, percent: Math.round((smes.filter((sme) => sme.risk_level === "High").length / total) * 100), color: "#ff7a00" },
          { label: "Defaulted", amount: "5%", percent: 5, color: "#ef2c2c" },
        ]
      : fallback;

  return (
    <div className="rounded-lg border border-[#e9eef8] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#071942]">Risk Distribution</h3>
        <button type="button" className="text-xs font-semibold text-[#315cff]">View full analytics</button>
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[130px_110px_1fr] items-center gap-4 text-xs">
            <span className="flex items-center gap-3 text-[#071942]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
              {row.label}
            </span>
            <span className="font-medium text-[#071942]">{row.amount}</span>
            <span className="h-1 rounded-full bg-[#dfe7f4]">
              <span className="block h-1 rounded-full" style={{ width: `${row.percent}%`, backgroundColor: row.color }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
