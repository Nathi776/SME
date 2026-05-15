import { BrowserRouter, Routes, Route } from "react-router-dom";
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


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/sme" element={<SmeRegisterPage />} />
        <Route path="/register/lender" element={<LenderRegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/dashboard" element={<ProtectedRoute roles={["sme"]}><Dashboard /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute roles={["sme"]}><InvoicePage /></ProtectedRoute>} />
        <Route path="/smes/:id" element={<ProtectedRoute roles={["admin", "lender"]}><SmeDetailPage /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute roles={["sme"]}><FinanceRequestPage /></ProtectedRoute>} />
        <Route path="/lender/dashboard" element={<ProtectedRoute roles={["lender"]}><LenderDashboard /></ProtectedRoute>} />
        <Route path="/lender/sme/:smeId" element={<ProtectedRoute roles={["lender", "admin"]}><LenderSMEDetailPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute roles={["admin", "lender"]}><AnalyticsDashboard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
