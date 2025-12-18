import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button
} from "@mui/material";
import axios from "axios";

interface DashboardStats {
  invoice_count: number;
  outstanding_balance: number;
  credit_score: number;
  finance_requests: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get("http://localhost:8000/sme/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Dashboard error:", err));
  }, []);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        SME Dashboard
      </Typography>

      {/* Stats Cards */}
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

      {/* Actions */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Quick Actions
        </Typography>

        <Button variant="contained" sx={{ mr: 2 }}>
          + Add Invoice
        </Button>

        <Button variant="outlined">
          Request Finance
        </Button>
      </Box>

      {/* Placeholder */}
      <Box mt={5}>
        <Typography variant="body1" color="text.secondary">
          Recent invoices and finance requests will appear here.
        </Typography>
      </Box>
    </Box>
  );
}

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
