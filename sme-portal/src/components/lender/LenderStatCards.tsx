import React from "react";

export type StatCard = {
  label: string;
  value: string;
};

type Props = {
  stats: StatCard[];
};

export default function LenderStatCards({ stats }: Props) {
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
