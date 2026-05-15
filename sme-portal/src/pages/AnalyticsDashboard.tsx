import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Container,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsMetrics {
  total_applications: number;
  approved_applications: number;
  rejected_applications: number;
  pending_applications: number;
  total_financed_amount: number;
  total_fees_collected: number;
  average_credit_score: number;
}

interface LoanRepayment {
  id: number;
  sme_name: string;
  amount: number;
  fee: number;
  status: string;
  due_date: string;
  paid_date: string | null;
}

export default function AnalyticsDashboard() {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setError("You are not logged in.");
      setLoading(false);
      return;
    }

    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Mock data for analytics - replace with actual API calls
      const mockMetrics: AnalyticsMetrics = {
        total_applications: 45,
        approved_applications: 28,
        rejected_applications: 12,
        pending_applications: 5,
        total_financed_amount: 2500000,
        total_fees_collected: 75000,
        average_credit_score: 62,
      };

      const mockRepayments: LoanRepayment[] = [
        {
          id: 1,
          sme_name: "TechStart Solutions",
          amount: 100000,
          fee: 3000,
          status: "paid",
          due_date: "2025-12-31",
          paid_date: "2025-12-28",
        },
        {
          id: 2,
          sme_name: "Green Industries",
          amount: 75000,
          fee: 2250,
          status: "paid",
          due_date: "2025-12-15",
          paid_date: "2025-12-14",
        },
        {
          id: 3,
          sme_name: "Digital Solutions Ltd",
          amount: 150000,
          fee: 7500,
          status: "pending",
          due_date: "2026-01-30",
          paid_date: null,
        },
      ];

      setMetrics(mockMetrics);
      setRepayments(mockRepayments);
      setLoading(false);
    } catch (err) {
      setError("Failed to load analytics");
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  // Prepare chart data
  const applicationStatusData = metrics ? [
    { name: "Approved", value: metrics.approved_applications, fill: theme.palette.success.main },
    { name: "Pending", value: metrics.pending_applications, fill: theme.palette.warning.main },
    { name: "Rejected", value: metrics.rejected_applications, fill: theme.palette.error.main },
  ] : [];

  const performanceData = [
    { month: "Jan", approved: 5, rejected: 2 },
    { month: "Feb", approved: 7, rejected: 1 },
    { month: "Mar", approved: 6, rejected: 3 },
    { month: "Apr", approved: 8, rejected: 2 },
    { month: "May", approved: 2, rejected: 4 },
  ];

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Analytics Dashboard
            </Typography>
            <Typography color="text.secondary">
              Portfolio performance and repayment analytics.
            </Typography>
          </Box>

          {error && <Typography color="error">{error}</Typography>}

          {metrics && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
              <Card><CardContent><Typography color="text.secondary" gutterBottom>Total Applications</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.total_applications}</Typography></CardContent></Card>

              <Card><CardContent><Typography color="text.secondary" gutterBottom>Approved Rate</Typography><Typography variant="h5" sx={{ color: theme.palette.success.main, fontWeight: 800 }}>{((metrics.approved_applications / metrics.total_applications) * 100).toFixed(0)}%</Typography></CardContent></Card>

              <Card><CardContent><Typography color="text.secondary" gutterBottom>Total Financed</Typography><Typography variant="h6" sx={{ fontWeight: 800 }}>R{(metrics.total_financed_amount / 1000000).toFixed(1)}M</Typography></CardContent></Card>

              <Card><CardContent><Typography color="text.secondary" gutterBottom>Avg Credit Score</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.average_credit_score.toFixed(0)}</Typography></CardContent></Card>
            </Box>
          )}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
            <Card><CardContent><Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Application Status Distribution</Typography>{metrics && (<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={applicationStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill={theme.palette.primary.main} dataKey="value">{applicationStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer>)}</CardContent></Card>

            <Card><CardContent><Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Monthly Performance</Typography><ResponsiveContainer width="100%" height={300}><BarChart data={performanceData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="approved" fill={theme.palette.success.main} /><Bar dataKey="rejected" fill={theme.palette.error.main} /></BarChart></ResponsiveContainer></CardContent></Card>
          </Box>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Recent Repayments</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>SME Name</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Fee</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Paid Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {repayments.map((repayment) => (
                      <TableRow key={repayment.id}>
                        <TableCell>{repayment.sme_name}</TableCell>
                        <TableCell align="right">R{repayment.amount.toLocaleString()}</TableCell>
                        <TableCell align="right">R{repayment.fee.toLocaleString()}</TableCell>
                        <TableCell>{new Date(repayment.due_date).toLocaleDateString()}</TableCell>
                        <TableCell><Chip label={repayment.status} color={repayment.status === "paid" ? "success" : "warning"} size="small" /></TableCell>
                        <TableCell>{repayment.paid_date ? new Date(repayment.paid_date).toLocaleDateString() : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
