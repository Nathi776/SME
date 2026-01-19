import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import InvoicePage from "./pages/InvoicePage";
import SmeDetailPage from "./pages/SmeDetailPage";
import FinanceRequestPage from "./pages/FinanceRequestPage";
import Dashboard from "./pages/Dashboard";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/invoices" element={<InvoicePage />} />
        <Route path="/smes/:id" element={<SmeDetailPage />} />
        <Route path="/finance" element={<FinanceRequestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
