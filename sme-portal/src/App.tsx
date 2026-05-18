import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import SmeRegisterPage from "./pages/SmeRegisterPage";
import LenderRegisterPage from "./pages/LenderRegisterPage";
import InvoicePage from "./pages/InvoicePage";
import SmeDetailPage from "./pages/SmeDetailPage";
import FinanceRequestPage from "./pages/FinanceRequestPage";
import Dashboard from "./pages/Dashboard";
import LenderDashboard from "./pages/LenderDashboard";
import LenderSMEDetailPage from "./pages/LenderSMEDetailPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import TopHeader from "./components/layout/TopHeader";
import Sidebar from "./components/layout/Sidebar";
import Box from "@mui/material/Box";

/**
 * Layout-aware wrapper that conditionally renders TopHeader & Sidebar
 * based on the current route.
 * 
 * Routes WITHOUT layout (full-width):
 * - Auth: /, /login, /register*, /unauthorized
 * - Lender: /lender/* (uses LenderLayout internally)
 * 
 * Routes WITH layout (TopHeader + Sidebar):
 * - SME: /dashboard, /invoices, /finance, /smes, /analytics
 */
function LayoutWrapper() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Routes that should NOT show SME layout
  const noLayoutRoutes = [
    "/",
    "/login",
    "/register",
    "/register/sme",
    "/register/lender",
    "/unauthorized",
  ];

  // Lender routes use their own LenderLayout
  const isLenderRoute = location.pathname.startsWith("/lender");

  // Check if current route should show layout
  const showLayout = !noLayoutRoutes.includes(location.pathname) && !isLenderRoute;

  if (!showLayout) {
    // Full-width layout for auth/home routes and lender routes
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/sme" element={<SmeRegisterPage />} />
        <Route path="/register/lender" element={<LenderRegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/lender/dashboard" element={<ProtectedRoute roles={["lender"]}><LenderDashboard /></ProtectedRoute>} />
        <Route path="/lender/sme/:smeId" element={<ProtectedRoute roles={["lender", "admin"]}><LenderSMEDetailPage /></ProtectedRoute>} />
      </Routes>
    );
  }

  // TopHeader + Sidebar layout for SME routes
  return (
    <>
      <TopHeader onMenuToggle={() => setSidebarOpen((s) => !s)} />
      <Box sx={{ display: 'flex' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute roles={["sme"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute roles={["sme"]}><InvoicePage /></ProtectedRoute>} />
            <Route path="/smes/:id" element={<ProtectedRoute roles={["admin", "lender"]}><SmeDetailPage /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute roles={["sme"]}><FinanceRequestPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute roles={["admin", "lender"]}><AnalyticsDashboard /></ProtectedRoute>} />
          </Routes>
        </Box>
      </Box>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LayoutWrapper />
    </BrowserRouter>
  );
}

export default App;
