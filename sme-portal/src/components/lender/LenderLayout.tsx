import React, { useState } from "react";
import LenderSidebar from "./LenderSidebar";
import LenderHeader from "./LenderHeader";

type Props = { children?: React.ReactNode };

export default function LenderLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <LenderSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-60"} flex flex-col`}>
        <LenderHeader
          onMenuToggle={() => setSidebarOpen((p) => !p)}
          onSidebarToggle={() => setSidebarCollapsed((p) => !p)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-x-hidden p-4 lg:p-6 flex flex-col justify-between">
          <div className="flex-grow">
            {children}
          </div>
          <footer className="mt-12 border-t border-[#e9eef8] pt-6 pb-2 text-[11px] text-[#8f9bba]">
            <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
