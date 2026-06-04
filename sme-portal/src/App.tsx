import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ChooseRolePage from "./pages/ChooseRolePage";
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
import AppLayout from "./components/layout/AppLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<ChooseRolePage />} />
        <Route path="/register/sme" element={<SmeRegisterPage />} />
        <Route path="/register/lender" element={<LenderRegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route
          element={
            <ProtectedRoute roles={["sme"]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invoices" element={<InvoicePage />} />
          <Route path="/finance" element={<FinanceRequestPage />} />
          <Route path="/finance-requests" element={<FinanceRequestPage />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
        </Route>

        <Route path="/smes/:id" element={<ProtectedRoute roles={["admin", "lender"]}><SmeDetailPage /></ProtectedRoute>} />
  <Route path="/lender" element={<Navigate to="/lender/dashboard" replace />} />
        <Route path="/lender/dashboard" element={<ProtectedRoute roles={["lender"]}><LenderDashboard /></ProtectedRoute>} />
        <Route path="/lender/sme/:smeId" element={<ProtectedRoute roles={["lender", "admin"]}><LenderSMEDetailPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
