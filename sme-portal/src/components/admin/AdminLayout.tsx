import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const displayName = sessionStorage.getItem("username") || sessionStorage.getItem("email") || "Admin";
  const initials = displayName
    .split(/\s+|@/)
    .filter(Boolean)
    .map((val) => val[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AD";

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
      />
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"
        } flex flex-col`}
      >
        {/* Admin Header */}
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-[#dfe7f4] bg-white/95 px-5 shadow-[0_6px_20px_rgba(9,30,66,0.04)] backdrop-blur lg:px-8">
          <div className="flex items-center gap-7">
            <button
              onClick={() => setSidebarOpen((p) => !p)}
              className="rounded-md p-2 text-[#071942] transition hover:bg-[#eaf0fb] lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={() => setCollapsed((p) => !p)}
              className="hidden rounded-md p-2 text-[#071942] transition hover:bg-[#eaf0fb] lg:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-6 w-6" /> : <PanelLeftClose className="h-6 w-6" />}
            </button>
            <h2 className="text-[22px] font-semibold text-[#071942]">Admin Portal</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8edf8] text-sm font-bold text-[#071942]">
                {initials}
              </div>
              <div className="hidden sm:block flex-col justify-start text-left">
                <p className="text-sm font-semibold leading-tight text-[#071942]">{displayName}</p>
                <p className="mt-1 text-xs text-[#31456f]">System Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden p-4 lg:p-6 flex flex-col justify-between">
          <div className="flex-grow">
            <Outlet />
          </div>
          <footer className="mt-12 border-t border-slate-100 pt-6 pb-2 text-[11px] text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© 2026 SME Finance (Pty) Ltd. All rights reserved. SME Finance is a registered Credit Provider, FSP No: 48992.</p>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold">AES-256 SECURED</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
