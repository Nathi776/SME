import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Key, ShieldCheck, LogOut, BarChart3
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: ShieldCheck, label: "Verifications", path: "/admin/verifications" },
  { icon: Key, label: "API Keys", path: "/admin/api-keys" },
];

export default function AdminSidebar({
  isOpen,
  onClose,
  collapsed,
}: {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col overflow-hidden transition-all duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "w-[72px]" : "w-[240px]"}`}
        style={{ background: '#0B1437', color: '#ffffff' }}
      >
        {/* Logo */}
        <div className={`border-b border-white/10 ${collapsed ? "flex items-center justify-center px-3 py-6" : "flex flex-col items-center px-4 pb-8 pt-6"}`}>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#4f63f6] shadow-[0_10px_25px_rgba(79,99,246,0.3)] ${collapsed ? "" : "mb-3"}`}>
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div className="text-center">
              <h1 className="text-base font-bold leading-tight tracking-wide text-white">SME FINANCE</h1>
              <p className="mt-1 text-[10px] tracking-wider text-white/75">ADMIN PORTAL</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 min-h-0 overflow-y-auto ${collapsed ? "px-2" : "px-3"} py-4 space-y-7`}>
          <div>
            {!collapsed && (
              <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-white/40">
                System Admin
              </p>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-[#4f63f6] text-white shadow-[0_10px_25px_rgba(79,99,246,0.25)]"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Logout */}
        <div className={`shrink-0 mx-4 border-t border-white/10 py-4 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className="flex w-full items-center justify-start gap-3 rounded-lg py-2.5 px-3 text-sm font-medium text-[#ff5a5a] transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
