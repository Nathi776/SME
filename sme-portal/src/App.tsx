import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import LoginPage from "./pages/LoginPage";
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
    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
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
    </SnackbarProvider>
  );
}

export default App;
