import React from "react";
import { BadgeDollarSign, FileText, ShieldCheck, WalletCards } from "lucide-react";

const actions = [
  { icon: ShieldCheck, label: "Review Requests", desc: "View pending applications" },
  { icon: BadgeDollarSign, label: "Fund a Deal", desc: "Invest in an SME" },
  { icon: FileText, label: "Portfolio Report", desc: "Download reports" },
  { icon: WalletCards, label: "Add Funds", desc: "Top up your balance" },
];

export default function LenderQuickActions() {
  return (
    <div className="rounded-lg border border-[#e9eef8] bg-white p-5 shadow-sm">
      <h3 className="text-[15px] font-semibold text-[#071942]">Quick Actions</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="flex h-[72px] items-center gap-4 rounded-md border border-[#d8e2f3] bg-[#f8faff] px-4 text-left transition hover:border-[#a9bcf5] hover:bg-white"
          >
            <action.icon className="h-6 w-6 shrink-0 text-[#315cff]" />
            <span>
              <span className="block text-sm font-semibold text-[#071942]">{action.label}</span>
              <span className="mt-1 block text-xs text-[#31456f]">{action.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
