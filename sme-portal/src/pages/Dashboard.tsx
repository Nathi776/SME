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
import { formatZAR } from "../utils/format";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material/styles";

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
  const theme = useTheme();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [latestInvoices, setLatestInvoices] = useState<Invoice[]>([]);
  const [financeRequests, setFinanceRequests] = useState<FinanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
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

        setAllInvoices(invRes.data);
        setLatestInvoices(invRes.data.slice(-5).reverse());
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
    <Box p={4} bgcolor="background.default" minHeight="100vh">
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
          value={formatZAR(stats?.outstanding_balance ?? 0)}
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
            Invoice Status Breakdown
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This chart shows the number of invoices in each status, not the total amount.
          </Typography>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                {
                  name: "Paid",
                  value: allInvoices.filter((i) => i.status?.toLowerCase() === "paid").length,
                },
                {
                  name: "Pending",
                  value: allInvoices.filter((i) => i.status?.toLowerCase() === "pending").length,
                },
                {
                  name: "Overdue",
                  value: allInvoices.filter((i) => i.status?.toLowerCase() === "overdue").length,
                },
              ]}
            >
              <XAxis dataKey="name" />
              <Tooltip formatter={(value) => [`${value} invoice(s)`, "Count"]} />
              <Bar dataKey="value" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} />
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

          {latestInvoices.length === 0 ? (
            <Typography color="text.secondary">
              No invoices found.
            </Typography>
          ) : (
            latestInvoices.map((inv) => (
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
                      {formatZAR(inv.amount)}
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

            <Typography>Requested: {formatZAR(fr.amount_requested)}</Typography>

            {fr.approved_amount && (
              <>
                <Typography>
                  Approved: <strong>{formatZAR(fr.approved_amount)}</strong>
                </Typography>

                <Typography color="text.secondary">
                  Platform Fee: {formatZAR(fr.platform_fee ?? 0)}
                </Typography>

                <Typography color="success.main" fontWeight="bold">
                  Net Amount You Receive: {formatZAR(fr.net_amount ?? 0)}
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
