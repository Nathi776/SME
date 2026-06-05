import React from "react";
import { Bell, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { getRole } from "../../utils/auth";

type Props = { onMenuToggle?: () => void; onSidebarToggle?: () => void; sidebarCollapsed?: boolean };

export default function LenderHeader({ onMenuToggle, onSidebarToggle, sidebarCollapsed }: Props) {
  const role = getRole();
  const displayName = sessionStorage.getItem("username") || "Lerato Mokoena";
  const initials =
    displayName
      .split(/\s+|@/)
      .filter(Boolean)
      .map((value) => value[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "LM";
  const roleLabel = role ? "Lender • Premium" : "Lender • Premium";

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#dfe7f4] bg-white/95 px-5 shadow-[0_6px_20px_rgba(9,30,66,0.04)] backdrop-blur lg:px-8">
      <div className="flex items-center gap-6">
        <button onClick={onMenuToggle} className="rounded-md p-2 text-[#071942] transition hover:bg-[#eaf0fb] lg:hidden" aria-label="Open sidebar">
          <Menu className="h-6 w-6" />
        </button>
        <button
          onClick={onSidebarToggle}
          className="hidden rounded-md p-2 text-[#071942] transition hover:bg-[#eaf0fb] lg:inline-flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-6 w-6" /> : <PanelLeftClose className="h-6 w-6" />}
        </button>
        <h2 className="text-[22px] font-bold tracking-wide text-[#071942]">LENDER DASHBOARD</h2>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative rounded-md p-2 text-[#071942] transition hover:bg-[#eaf0fb]" aria-label="Notifications">
          <Bell className="h-6 w-6" />
          <span className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4f63f6] text-sm font-bold text-white">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-[#071942]">{displayName}</p>
            <p className="mt-1 text-xs text-[#31456f]">{roleLabel}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-[#071942] sm:block" />
        </div>
      </div>
    </header>
  );
}
