import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ChooseRolePage from "./pages/ChooseRolePage";
import SmeRegisterPage from "./pages/SmeRegisterPage";
import LenderRegisterPage from "./pages/LenderRegisterPage";
import InvoicePage from "./pages/InvoicePage";
import UploadInvoicePage from "./pages/UploadInvoicePage";
import SmeDetailPage from "./pages/SmeDetailPage";
import FinanceRequestPage from "./pages/FinanceRequestPage";
import Dashboard from "./pages/Dashboard";
import LenderDashboard from "./pages/LenderDashboard";
import LenderSMEDetailPage from "./pages/LenderSMEDetailPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVerifications from "./pages/AdminVerifications";
import DocumentsPage from "./pages/DocumentsPage";
import TransactionsPage from "./pages/TransactionsPage";
import MessagesPage from "./pages/MessagesPage";
import CreditScorePage from "./pages/CreditScorePage";
import CreditScoreDetails from "./pages/CreditScoreDetails";
import LenderDecisionEngine from "./pages/LenderDecisionEngine";
import LenderReviewRequestsPage from "./pages/LenderReviewRequestsPage";
import LenderRequestDetailPage from "./pages/LenderRequestDetailPage";
import LenderFundADealPage from "./pages/LenderFundADealPage";
import LenderPortfolioReportPage from "./pages/LenderPortfolioReportPage";
import LenderAddFundsPage from "./pages/LenderAddFundsPage";
import CustomersPage from "./pages/CustomersPage";
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
          <Route path="/invoices/upload" element={<UploadInvoicePage />} />
          <Route path="/finance" element={<FinanceRequestPage />} />
          <Route path="/finance-requests" element={<FinanceRequestPage />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/credit-score" element={<CreditScorePage />} />
          <Route path="/credit-score/details" element={<CreditScoreDetails />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
        </Route>

        <Route path="/smes/:id" element={<ProtectedRoute roles={["admin", "lender"]}><SmeDetailPage /></ProtectedRoute>} />
        <Route path="/lender" element={<Navigate to="/lender/dashboard" replace />} />
        <Route path="/lender/dashboard" element={<ProtectedRoute roles={["lender"]}><LenderDashboard /></ProtectedRoute>} />
        <Route path="/lender/sme/:smeId" element={<ProtectedRoute roles={["lender", "admin"]}><LenderSMEDetailPage /></ProtectedRoute>} />
        <Route path="/lender/decision-engine" element={<ProtectedRoute roles={["lender"]}><LenderDecisionEngine /></ProtectedRoute>} />
        <Route path="/lender/fund-a-deal" element={<ProtectedRoute roles={["lender"]}><LenderFundADealPage /></ProtectedRoute>} />
        <Route path="/lender/portfolio-report" element={<ProtectedRoute roles={["lender"]}><LenderPortfolioReportPage /></ProtectedRoute>} />
        <Route path="/lender/add-funds" element={<ProtectedRoute roles={["lender"]}><LenderAddFundsPage /></ProtectedRoute>} />
        <Route path="/lender/review-requests" element={<ProtectedRoute roles={["lender"]}><LenderReviewRequestsPage /></ProtectedRoute>} />
        <Route path="/lender/review-requests/:id" element={<ProtectedRoute roles={["lender"]}><LenderRequestDetailPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/verifications" element={<ProtectedRoute roles={["admin"]}><AdminVerifications /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
