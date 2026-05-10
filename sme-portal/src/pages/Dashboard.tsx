import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Skeleton,
  Stack,
  Divider,
  Chip,
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
  approved_amount?: number;
  platform_fee?: number;
  net_amount?: number; 
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
        if (!res.data?.sme_id) {
          throw new Error("Invalid dashboard data");
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
        console.error("Dashboard error", err);
        setError("Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box p={4} bgcolor="#f8fafc" minHeight="100vh">
      {/* ===== HEADER ===== */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700}>
          SME Dashboard
        </Typography>
        <Typography color="text.secondary">
          Overview of your business performance
        </Typography>
      </Box>

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
        <StatCard title="Credit Score" value={stats?.credit_score ?? "-"} />
        <StatCard
          title="Finance Requests"
          value={stats?.finance_requests ?? 0}
        />
      </Box>

      {/* ===== ACTIONS ===== */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>

          <Stack direction="row" spacing={2} mt={1}>
            <Button
              variant="contained"
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

            <Button
              variant="text"
              onClick={() => navigate("/invoices")}
            >
              Manage Invoices
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ===== CHART ===== */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Invoice Overview
          </Typography>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                {
                  name: "Paid",
                  value: invoices.filter((i) => i.status?.toLowerCase() === "paid").length,
                },
                {
                  name: "Pending",
                  value: invoices.filter((i) => i.status?.toLowerCase() === "pending").length,
                },
                {
                  name: "Overdue",
                  value: invoices.filter((i) => i.status?.toLowerCase() === "overdue").length,
                },
              ]}
            >
              <XAxis dataKey="name" />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ===== INVOICES ===== */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest Invoices
          </Typography>

          {invoices.length === 0 ? (
            <Typography color="text.secondary">
              No invoices found.
            </Typography>
          ) : (
            invoices.map((inv) => (
              <Box key={inv.id} mb={2}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography fontWeight={600}>
                      Invoice #{inv.id} — {inv.client_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Due: {inv.due_date}
                    </Typography>
                  </Box>

                  <Box textAlign="right">
                    <Typography fontWeight={600}>
                      R {inv.amount}
                    </Typography>
                    <Chip
                      size="small"
                      label={inv.status?.toLowerCase?.() ?? inv.status}
                      color={
                        inv.status?.toLowerCase() === "paid"
                          ? "success"
                          : inv.status?.toLowerCase() === "overdue"
                          ? "error"
                          : "warning"
                      }
                    />
                  </Box>
                </Stack>
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* ===== FINANCE REQUESTS ===== */}
      {financeRequests.map((fr) => (
        <Card
          key={fr.id}
          sx={{
            mb: 2,
            borderLeft: "6px solid",
            borderColor:
              fr.status === "approved"
                ? "success.main"
                : fr.status === "rejected"
                ? "error.main"
                : "warning.main",
          }}
        >
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold">
              Finance Request #{fr.id}
            </Typography>

            <Typography>Requested: R {fr.amount_requested}</Typography>

            {fr.approved_amount && (
              <>
                <Typography>
                  Approved: <strong>R {fr.approved_amount}</strong>
                </Typography>

                <Typography color="text.secondary">
                  Platform Fee: R {fr.platform_fee ?? 0}
                </Typography>

                <Typography color="success.main" fontWeight="bold">
                  Net Amount You Receive: R {fr.net_amount ?? 0}
                </Typography>
              </>
            )}

            <Typography
              sx={{ mt: 1 }}
              color={
                fr.status === "approved"
                  ? "success.main"
                  : fr.status === "rejected"
                  ? "error.main"
                  : "warning.main"
              }
            >
              Status: {fr.status.toUpperCase()}
            </Typography>

            {fr.decision && (
              <Typography color="text.secondary">
                Lender Decision: {fr.decision}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}

    </Box>
  );
}

/* ================= UI HELPERS ================= */

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <Box p={4}>
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        gap={3}
      >
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" height={110} />
        ))}
      </Box>

      <Skeleton sx={{ mt: 4 }} variant="rectangular" height={240} />
      <Skeleton sx={{ mt: 4 }} variant="rectangular" height={300} />
    </Box>
  );
}
