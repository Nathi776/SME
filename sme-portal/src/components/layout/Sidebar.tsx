import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, User, FileText, CreditCard, Star, Users,
  ArrowRightLeft, FolderOpen, MessageSquare, HelpCircle, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";

const navSections = [
  {
    label: "",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { icon: User, label: "My Profile", path: "/profile" },
      { icon: FileText, label: "Invoices", path: "/invoices" },
      { icon: CreditCard, label: "Finance Requests", path: "/finance-requests" },
      { icon: Star, label: "Credit Score", path: "/credit-score" },
      { icon: Users, label: "Customers", path: "/customers" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { icon: ArrowRightLeft, label: "Transactions", path: "/transactions" },
      { icon: FolderOpen, label: "Documents", path: "/documents" },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      { icon: MessageSquare, label: "Messages", path: "/messages" },
      { icon: HelpCircle, label: "Help Center", path: "/help" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

export default function Sidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full transition-all duration-300 lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "w-[72px]" : "w-sidebar"}`}
        style={{ background: 'linear-gradient(180deg,#0f2b48 0%,#071a2b 100%)', color: '#ffffff' }}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center px-3 py-5" : "gap-3 px-5 py-6"}`}>
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-white font-bold text-sm tracking-wide">SME FINANCE</h1>
              <p className="text-sidebar-foreground text-[10px] tracking-widest">Grow Your Business</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex ml-auto items-center justify-center rounded-md p-2 text-white/90 hover:bg-white/6"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"} space-y-5`}>
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.label && !collapsed && (
                <p className="text-[10px] font-semibold tracking-widest uppercase px-3 mb-2 text-white/70">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-[#2F6BFF] text-white shadow-lg"
                          : "text-white/90 hover:bg-white/6 hover:text-white"
                      }`}
                      style={active ? { boxShadow: '0 6px 20px rgba(47,107,255,0.12)' } : undefined}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className={`border-t border-sidebar-border p-3 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={() => {
              onClose();
              navigate("/login");
            }}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-colors`}
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
