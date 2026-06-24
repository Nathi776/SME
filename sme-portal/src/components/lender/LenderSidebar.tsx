import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, ArrowRightLeft, Users, BarChart2,
  LogOut, Home, Settings, ShieldCheck, BadgeDollarSign, Wallet
} from "lucide-react";
import { logout } from "../../utils/auth";
import { LenderApi } from "../../api/lenderApi";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/lender/dashboard" },
  { icon: ShieldCheck, label: "Review Requests", path: "/lender/review-requests", hasBadge: true },
  { icon: BadgeDollarSign, label: "Fund a Deal", path: "/lender/fund-a-deal" },
  { icon: Briefcase, label: "Funded Deals", path: "/lender/funded-deals" },
  { icon: BarChart2, label: "Portfolio Report", path: "/lender/portfolio-report" },
  { icon: Wallet, label: "Add Funds", path: "/lender/add-funds" },
  { icon: ArrowRightLeft, label: "Transactions", path: "/lender/transactions" },
  { icon: BarChart2, label: "Reports", path: "/lender/reports" },
  { icon: Settings, label: "Settings", path: "/lender/decision-engine" },
];

type Props = { isOpen?: boolean; onClose?: () => void; collapsed: boolean; onToggleCollapse: () => void };

export default function LenderSidebar({ isOpen, onClose, collapsed, onToggleCollapse }: Props) {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await LenderApi.getPendingRequests();
        if (response.data) {
          setPendingCount(response.data.length);
        }
      } catch (error) {
        console.error("Failed to fetch pending requests for sidebar badge:", error);
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden bg-[#071b3f] text-white shadow-[10px_0_30px_rgba(7,25,66,0.12)] transition-all duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
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
          <div>
            {!collapsed && (
              <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
                Main Menu
              </p>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const isReviewRequests = item.path === "/lender/review-requests";
                const isFundADeal = item.path === "/lender/fund-a-deal";
                const isPortfolioReport = item.path === "/lender/portfolio-report";
                const isAddFunds = item.path === "/lender/add-funds";

                const active = location.pathname === item.path ||
                  (isReviewRequests && location.pathname.startsWith("/lender/review-requests")) ||
                  (isFundADeal && location.pathname.startsWith("/lender/fund-a-deal")) ||
                  (isPortfolioReport && location.pathname.startsWith("/lender/portfolio-report")) ||
                  (isAddFunds && location.pathname.startsWith("/lender/add-funds"));

                const Icon = item.icon as any;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${active
                        ? "bg-[#4f63f6] text-white shadow-[0_12px_24px_rgba(79,99,246,0.3)]"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <Icon className="w-[17px] h-[17px] shrink-0" />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {item.hasBadge && pendingCount > 0 && !collapsed && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>


        {/* Logout */}
        <div className={`mx-4 border-t border-white/10 py-4 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className="flex w-full items-center justify-start gap-3 rounded-lg py-2.5 px-3 text-sm font-medium text-[#ff5a5a] transition-colors hover:bg-red-500/10"
          >
            <LogOut className="w-[17px] h-[17px]" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
