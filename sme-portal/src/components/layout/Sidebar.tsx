import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, User, FileText, CreditCard, Star, Users,
  ArrowRightLeft, FolderOpen, MessageSquare, HelpCircle, Settings, LogOut,
  BarChart3
} from "lucide-react";

const navSections = [
  {
    label: "",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
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
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col overflow-hidden transition-all duration-300 lg:sticky lg:top-0 lg:z-20 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "w-[72px]" : "w-sidebar"}`}
        style={{ background: '#0B1437', color: '#ffffff' }}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/10 ${collapsed ? "justify-center px-3 py-6" : "justify-center px-5 pb-8 pt-7"}`}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1f724f] shadow-[0_10px_25px_rgba(25,196,113,0.2)]">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          {!collapsed && (
            <div className="ml-3 text-center">
              <h1 className="text-base font-bold tracking-wide text-white">SME FINANCE</h1>
              <p className="mt-1 text-[10px] text-white/75">Grow Your Business</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 min-h-0 overflow-y-auto ${collapsed ? "px-2" : "px-4"} space-y-7`}>
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.label && !collapsed && (
                <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wide text-white/75">
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
                      className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-4 px-3"} py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-[#3f63f1] text-white shadow-[0_10px_25px_rgba(49,92,255,0.28)]"
                          : "text-white/90 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className={`shrink-0 mx-4 border-t border-white/10 py-4 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={() => {
              onClose();
              navigate("/login");
            }}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-4 px-3"} w-full rounded-md py-3 text-sm font-medium text-[#ff5a5a] transition-colors hover:bg-red-500/10`}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
