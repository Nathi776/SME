import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Skeleton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ================= TYPES ================= */

interface DashboardStats {
  invoice_count: number;
  outstanding_balance: number;
  credit_score: number | null;
  finance_requests: number;
  sme_id: number;
}

interface Invoice {
  id: number;
  client_name: string;
  amount: number;
  due_date: string;
  status: string;
}

interface FinanceRequest {
  id: number;
  amount_requested: number;
  status: string;
  decision: string | null;
}

/* ================= COMPONENT ================= */

export default function DashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [financeRequests, setFinanceRequests] = useState<FinanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not logged in.");
      setLoading(false);
      return;
    }

    api.get("/smes/dashboard")
      .then(async (res) => {
        console.log("Dashboard API", res.data);
        if(!res.data?.sme_id){
          throw new Error("Invaild dashboard data")
        }

        setStats(res.data);

        const smeId = res.data.sme_id;

        const [invRes, finRes] = await Promise.all([
          api.get(`/invoices/sme/${smeId}`),
          api.get(`/finance/requests/${smeId}`),
        ]);

        setInvoices(invRes.data.slice(-5).reverse());
        setFinanceRequests(finRes.data.slice(-5).reverse());
      })
      .catch((err) => {
        console.error("Dashboard error",err);
        setError("Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        SME Dashboard
      </Typography>

      {/* ===== STATS ===== */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        gap={3}
      >
        <StatCard title="Total Invoices" value={stats?.invoice_count ?? 0} />
        <StatCard
          title="Outstanding Balance"
          value={`R ${stats?.outstanding_balance ?? 0}`}
        />
        <StatCard
          title="Credit Score"
          value={stats?.credit_score ?? "-"}
        />
        <StatCard
          title="Finance Requests"
          value={stats?.finance_requests ?? 0}
        />
      </Box>

      {/* ===== ACTIONS ===== */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Quick Actions
        </Typography>

        <Button
          variant="contained"
          sx={{ mr: 2 }}
          onClick={() => navigate("/invoices")}
        >
          + Add Invoice
        </Button>

        <Button
          variant="outlined"
          onClick={() => navigate("/finance")}
        >
          Request Finance
        </Button>

        <Button onClick={() => navigate("/invoices")}>
          Manage Invoices
        </Button>

      </Box>

      {/* ===== CHART ===== */}
      <Box mt={5}>
        <Typography variant="h5">Invoice Overview</Typography>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={[
              {
                name: "Paid",
                value: invoices.filter((i) => i.status === "paid").length,
              },
              {
                name: "Pending",
                value: invoices.filter((i) => i.status === "pending").length,
              },
              {
                name: "Overdue",
                value: invoices.filter((i) => i.status === "overdue").length,
              },
            ]}
          >
            <XAxis dataKey="name" />
            <Tooltip />
            <Bar dataKey="value" fill="#1976d2" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* ===== INVOICES ===== */}
      <Box mt={5}>
        <Typography variant="h5">Latest Invoices</Typography>
        {invoices.length === 0 ? (
          <p>No invoices found.</p>
        ) : (
          invoices.map((inv) => (
            <Card key={inv.id} sx={{ mb: 1 }}>
              <CardContent>
                <Typography>
                  <strong>Invoice #{inv.id}</strong> — {inv.client_name}
                </Typography>
                <Typography>Amount: R {inv.amount}</Typography>
                <Typography>Due: {inv.due_date}</Typography>
                <Typography
                  color={
                    inv.status === "paid"
                      ? "green"
                      : inv.status === "overdue"
                      ? "red"
                      : "orange"
                  }
                >
                  Status: {inv.status}
                </Typography>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* ===== FINANCE REQUESTS ===== */}
      <Box mt={5}>
        <Typography variant="h5">Finance Requests</Typography>
        {financeRequests.length === 0 ? (
          <p>No finance requests found.</p>
        ) : (
          financeRequests.map((fr) => (
            <Card key={fr.id} sx={{ mb: 1 }}>
              <CardContent>
                <Typography>
                  <strong>Request #{fr.id}</strong>
                </Typography>
                <Typography>Amount: R {fr.amount_requested}</Typography>
                <Typography
                  color={
                    fr.status === "Approved"
                      ? "green"
                      : fr.status === "Rejected"
                      ? "red"
                      : "orange"
                  }
                >
                  Status: {fr.status}
                </Typography>
                <Typography>
                  Decision: {fr.decision || "-"}
                </Typography>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
}

/* ================= UI HELPERS ================= */

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4">{value}</Typography>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <Box p={3}>
      <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" height={120} />
        ))}
      </Box>

      <Box mt={4}>
        <Skeleton variant="text" height={40} />
        <Skeleton variant="rectangular" height={200} />
      </Box>
    </Box>
  );
}
