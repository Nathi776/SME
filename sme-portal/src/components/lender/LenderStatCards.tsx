import React from "react";

const stats = [
  { label: "Portfolio Size", value: "R12,450,000" },
  { label: "Active Loans", value: "128" },
  { label: "Yield (30d)", value: "7.2%" },
  { label: "Delinquency", value: "1.4%" },
];

export default function LenderStatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-400">{s.label}</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
