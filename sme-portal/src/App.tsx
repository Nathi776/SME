import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import InvoicePage from "./pages/InvoicePage";
import SmeDetailPage from "./pages/SmeDetailPage";
import FinanceRequestPage from "./pages/FinanceRequestPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/invoices" element={<InvoicePage />} />
        <Route path="/smes/:id" element={<SmeDetailPage />} />
        <Route path="/finance" element={<FinanceRequestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
