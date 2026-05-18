import React, { useState } from "react";
import LenderSidebar from "./LenderSidebar";
import LenderHeader from "./LenderHeader";

type Props = { children?: React.ReactNode };

export default function LenderLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <LenderSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-60 flex flex-col min-h-screen">
        <LenderHeader onMenuToggle={() => setSidebarOpen((p) => !p)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
