import { Menu, Bell, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function TopHeader({
  onMenuToggle,
  onSidebarToggle,
  sidebarCollapsed,
}: {
  onMenuToggle?: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
}) {
  const initials = "U";

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={onSidebarToggle}
          className="hidden lg:inline-flex p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-foreground" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-foreground" />
          )}
        </button>
        <h2 className="text-lg font-semibold text-foreground">SME Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-tight">User</p>
            <p className="text-[11px] text-muted-foreground">Premium Plan</p>
          </div>
        </div>
      </div>
    </header>
  );
}
