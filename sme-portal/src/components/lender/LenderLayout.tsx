import React, { useState } from "react";
import LenderSidebar from "./LenderSidebar";
import LenderHeader from "./LenderHeader";

type Props = { children?: React.ReactNode };

export default function LenderLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <LenderSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <div className="flex flex-col min-h-screen lg:ml-0">
        <LenderHeader
          onMenuToggle={() => setSidebarOpen((p) => !p)}
          onSidebarToggle={() => setSidebarCollapsed((p) => !p)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
