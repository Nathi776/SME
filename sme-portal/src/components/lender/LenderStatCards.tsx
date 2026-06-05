import React from "react";
import type { LucideIcon } from "lucide-react";

export type StatCard = {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  color: string;
  bg: string;
};

type Props = {
  stats: StatCard[];
};

export default function LenderStatCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="flex min-h-[128px] items-center gap-5 rounded-lg border border-[#e9eef8] bg-white p-5 shadow-sm">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${s.bg}`}>
            <s.icon className={`h-6 w-6 ${s.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#071942]">{s.label}</p>
            <p className="mt-3 text-[24px] font-bold leading-none text-[#071942]">{s.value}</p>
            <p className="mt-3 text-xs text-[#31456f]">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
