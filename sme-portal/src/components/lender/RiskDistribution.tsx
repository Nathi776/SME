import React from "react";
import type { AvailableSme } from "../../api/lenderApi";

type Props = {
  smes: AvailableSme[];
};

export default function RiskDistribution({ smes }: Props) {
  const counts = smes.reduce(
    (accumulator, sme) => {
      if (sme.risk_level === "High") accumulator.high += 1;
      if (sme.risk_level === "Medium") accumulator.medium += 1;
      if (sme.risk_level === "Low") accumulator.low += 1;
      return accumulator;
    },
    { high: 0, medium: 0, low: 0 },
  );

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Risk Distribution</h3>
      <div className="mt-3 space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-red-700">
          <span>High risk</span>
          <span className="font-semibold">{counts.high}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-amber-700">
          <span>Medium risk</span>
          <span className="font-semibold">{counts.medium}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
          <span>Low risk</span>
          <span className="font-semibold">{counts.low}</span>
        </div>
      </div>
    </div>
  );
}
