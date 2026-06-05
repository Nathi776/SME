import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Bell, FileText, Briefcase, RefreshCw,
  PieChart, ArrowRightLeft, Users, BarChart2, FileBarChart,
  TrendingUp, User, CreditCard, LogOut, Home
} from "lucide-react";
import { logout } from "../../utils/auth";

const navSections = [
  {
    label: "OVERVIEW",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/lender/dashboard" },
      { icon: Bell, label: "Notifications", path: "/lender/notifications", badge: 3 },
    ],
  },
  {
    label: "FINANCING",
    items: [
      { icon: FileText, label: "Financing Requests", path: "/lender/financing-requests" },
      { icon: Briefcase, label: "Funded Deals", path: "/lender/funded-deals" },
      { icon: RefreshCw, label: "Repayments", path: "/lender/repayments" },
    ],
  },
  {
    label: "PORTFOLIO",
    items: [
      { icon: PieChart, label: "Portfolio Overview", path: "/lender/portfolio" },
      { icon: ArrowRightLeft, label: "Transactions", path: "/lender/transactions" },
      { icon: Users, label: "Lenders & SMEs", path: "/lender/lenders-smes" },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { icon: BarChart2, label: "Risk Analytics", path: "/lender/risk-analytics" },
      { icon: FileBarChart, label: "Reports", path: "/lender/reports" },
      { icon: TrendingUp, label: "Performance", path: "/lender/performance" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { icon: User, label: "Profile Settings", path: "/lender/profile" },
      { icon: CreditCard, label: "Bank Details", path: "/lender/bank-details" },
    ],
  },
];

type Props = { isOpen?: boolean; onClose?: () => void; collapsed: boolean; onToggleCollapse: () => void };

export default function LenderSidebar({ isOpen, onClose, collapsed, onToggleCollapse }: Props) {
  const location = useLocation();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden bg-[#071b3f] text-white shadow-[10px_0_30px_rgba(7,25,66,0.12)] transition-all duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-60"}`}
      >
        {/* Logo */}
        <div className={`${collapsed ? "flex items-center justify-center px-3 py-6" : "flex flex-col items-center px-4 pb-8 pt-6"}`}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-[#8b7cff] shadow-[0_10px_24px_rgba(139,124,255,0.32)] ${collapsed ? "" : "mb-3"}`}>
            <Home className="h-7 w-7 text-white" />
          </div>
          {!collapsed && (
            <>
              <h1 className="text-[20px] font-bold leading-tight tracking-wide text-white">SME FINANCE</h1>
              <p className="mt-1 text-xs tracking-[0.16em] text-white/75">LENDER PORTAL</p>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-4"} space-y-6`}>
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {!collapsed && (
                <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-white/55">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = location.pathname === item.path;
                  const Icon = item.icon as any;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-[#4f63f6] text-white shadow-[0_12px_24px_rgba(79,99,246,0.3)]"
                          : "text-white/85 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="w-[17px] h-[17px] shrink-0" />
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {item.badge && (
                        <span className={`rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white ${collapsed ? "hidden" : ""}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className={`mx-4 border-t border-white/10 py-4 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={`flex w-full items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} rounded-lg py-2.5 text-sm font-medium text-[#ff5a5a] transition-colors hover:bg-red-500/10`}
          >
            <LogOut className="w-[17px] h-[17px]" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
