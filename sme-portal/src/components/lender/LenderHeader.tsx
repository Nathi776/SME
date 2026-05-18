import React from "react";
import { Menu, Bell } from "lucide-react";
import { getRole } from "../../utils/auth";

type Props = { onMenuToggle?: () => void };

export default function LenderHeader({ onMenuToggle }: Props) {
  const userName = "Lerato Mokoena";
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "LM";
  const roleLabel = getRole() ? "Lender • Premium" : "Lender Portal";

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 tracking-wide">LENDER DASHBOARD</h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">3</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#4F46E5] flex items-center justify-center">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>
            <p className="text-[11px] text-gray-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
