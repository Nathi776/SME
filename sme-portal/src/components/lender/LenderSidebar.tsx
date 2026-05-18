import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Bell, FileText, Briefcase, RefreshCw,
  PieChart, ArrowRightLeft, Users, BarChart2, FileBarChart,
  TrendingUp, User, CreditCard, LogOut
} from "lucide-react";
import { logout } from "../../utils/auth";

const navSections = [
  {
    label: "OVERVIEW",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/lender" },
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

type Props = { isOpen?: boolean; onClose?: () => void };

export default function LenderSidebar({ isOpen, onClose }: Props) {
  const location = useLocation();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-[#0B1437] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex flex-col items-center py-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center mb-2">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <h1 className="text-white font-bold text-sm tracking-wide">SME FINANCE</h1>
          <p className="text-white/40 text-[10px] tracking-widest mt-0.5">LENDER PORTAL</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              <p className="text-white/30 text-[10px] font-semibold tracking-widest uppercase px-3 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = location.pathname === item.path;
                  const Icon = item.icon as any;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/30"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="w-[17px] h-[17px]" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-colors"
          >
            <LogOut className="w-[17px] h-[17px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
