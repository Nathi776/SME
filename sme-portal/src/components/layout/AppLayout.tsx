import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((p) => !p)}
      />
      <div
        className={`min-h-screen transition-all duration-300 ${collapsed ? "lg:ml-[72px]" : "lg:ml-sidebar"} flex flex-col`}
      >
        <TopHeader
          onMenuToggle={() => setSidebarOpen((p) => !p)}
          onSidebarToggle={() => setCollapsed((p) => !p)}
          sidebarCollapsed={collapsed}
        />
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