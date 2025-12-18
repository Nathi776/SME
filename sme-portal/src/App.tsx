import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import InvoicePage from "./pages/InvoicePage";
import SmeDetailPage from "./pages/SmeDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/invoices" element={<InvoicePage />} />
        <Route path="/smes/:id" element={<SmeDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
