import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((p) => !p)}
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <TopHeader
          onMenuToggle={() => setSidebarOpen((p) => !p)}
          onSidebarToggle={() => setCollapsed((p) => !p)}
          sidebarCollapsed={collapsed}
        />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}