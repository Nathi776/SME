import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import {
  LineChart,
  Line,
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
import api from "../api/client";

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
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
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
    { name: "Approved", value: metrics.approved_applications, fill: "#4CAF50" },
    { name: "Pending", value: metrics.pending_applications, fill: "#FF9800" },
    { name: "Rejected", value: metrics.rejected_applications, fill: "#F44336" },
  ] : [];

  const performanceData = [
    { month: "Jan", approved: 5, rejected: 2 },
    { month: "Feb", approved: 7, rejected: 1 },
    { month: "Mar", approved: 6, rejected: 3 },
    { month: "Apr", approved: 8, rejected: 2 },
    { month: "May", approved: 2, rejected: 4 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Analytics Dashboard
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      {/* KPI Cards */}
      {metrics && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
          <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Applications
                </Typography>
                <Typography variant="h5">
                  {metrics.total_applications}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Approved Rate
                </Typography>
                <Typography variant="h5" sx={{ color: "#4CAF50" }}>
                  {((metrics.approved_applications / metrics.total_applications) * 100).toFixed(0)}%
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Financed
                </Typography>
                <Typography variant="h6">
                  R{(metrics.total_financed_amount / 1000000).toFixed(1)}M
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Credit Score
                </Typography>
                <Typography variant="h5">
                  {metrics.average_credit_score.toFixed(0)}
                </Typography>
              </CardContent>
            </Card>
        </Box>
      )}

      {/* Charts */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}>
        {/* Application Status Pie Chart */}
        <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Application Status Distribution
              </Typography>
              {metrics && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={applicationStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {applicationStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

        {/* Performance Over Time */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Monthly Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" fill="#4CAF50" />
                <Bar dataKey="rejected" fill="#F44336" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Repayment Status Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Repayments
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
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
                    <TableCell align="right">
                      R{repayment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      R{repayment.fee.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(repayment.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={repayment.status}
                        color={repayment.status === "paid" ? "success" : "warning"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {repayment.paid_date
                        ? new Date(repayment.paid_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
