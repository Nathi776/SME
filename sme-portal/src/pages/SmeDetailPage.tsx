import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SMEApi } from "../api/smeApi";
import axios from "axios";

interface Invoice {
  id: number;
  amount: number;
  status: string;
  due_date: string;
}

interface FinanceRequest {
  id: number;
  amount_requested: number;
  status: string;
  decision: string | null;
}

interface CreditScore {
  score: number;
  rating: string;
  last_updated: string;
}

interface Sme {
  id: number;
  name: string;
  registration_number: string;
  industry: string;
}

function SmeDetailPage() {
  const { id } = useParams();
  const smeId = Number(id);

  const [sme, setSme] = useState<Sme | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [financeRequests, setFinanceRequests] = useState<FinanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const smeRes = await SMEApi.getSmeDetails(smeId);
      setSme(smeRes.data);

      const invRes = await SMEApi.getSmeInvoices(smeId);
      setInvoices(invRes.data);

      const scoreRes = await SMEApi.getCreditScore(smeId);
      setCreditScore(scoreRes.data);

      const financeRes = await SMEApi.getFinanceRequests(smeId);
      setFinanceRequests(financeRes.data);

    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Failed to load SME data");
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <p>Loading SME data...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!sme) return <p>No SME found.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>SME: {sme.name}</h1>
      <p><strong>Registration:</strong> {sme.registration_number}</p>
      <p><strong>Industry:</strong> {sme.industry}</p>

      <hr />

      {/* CREDIT SCORE SECTION */}
      <h2>Credit Score</h2>
      {!creditScore && <p>No credit score available.</p>}
      {creditScore && (
        <div style={{ marginTop: 10 }}>
          <p><strong>Score:</strong> {creditScore.score}</p>
          <p><strong>Rating:</strong> {creditScore.rating}</p>
          <p><strong>Last Updated:</strong> {creditScore.last_updated}</p>
        </div>
      )}

      <hr />

      {/* INVOICES TABLE */}
      <h2>Invoices</h2>
      {invoices.length === 0 && <p>No invoices found.</p>}
      {invoices.length > 0 && (
        <table border={1} cellPadding={6} style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.amount}</td>
                <td>{inv.status}</td>
                <td>{inv.due_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr />

      {/* FINANCE REQUESTS TABLE */}
      <h2>Finance Requests</h2>
      {financeRequests.length === 0 && <p>No finance requests found.</p>}
      {financeRequests.length > 0 && (
        <table border={1} cellPadding={6} style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount Requested</th>
              <th>Status</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {financeRequests.map((fr) => (
              <tr key={fr.id}>
                <td>{fr.id}</td>
                <td>{fr.amount_requested}</td>
                <td>{fr.status}</td>
                <td>{fr.decision || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </div>
  );
}

export default SmeDetailPage;
