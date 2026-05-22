import { Bell, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function TopHeader({
  onMenuToggle,
  onSidebarToggle,
  sidebarCollapsed,
}: {
  onMenuToggle?: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#dfe7f4] bg-[#f8fbff]/95 px-5 shadow-[0_6px_20px_rgba(9,30,66,0.04)] backdrop-blur lg:px-8">
      <div className="flex items-center gap-7">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-[#071942] transition hover:bg-[#eaf0fb] lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        <button
          onClick={onSidebarToggle}
          className="hidden rounded-md p-2 text-[#071942] transition hover:bg-[#eaf0fb] lg:inline-flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-6 w-6" /> : <PanelLeftClose className="h-6 w-6" />}
        </button>
        <h2 className="text-2xl font-bold tracking-[-0.01em] text-[#071942]">SME Dashboard</h2>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative rounded-md p-2 text-[#071942] transition hover:bg-[#eaf0fb]" aria-label="Notifications">
          <Bell className="h-6 w-6" />
          <span className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white">
            3
          </span>
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8edf8] text-sm font-bold text-[#071942]">
            TM
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-[#071942]">Thabo Mokoena</p>
            <p className="mt-1 text-xs text-[#31456f]">Premium Plan</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-[#071942] sm:block" />
        </div>
      </div>
    </header>
  );
}
