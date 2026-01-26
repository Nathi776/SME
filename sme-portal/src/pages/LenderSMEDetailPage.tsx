import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import api from "../api/client";

interface SMEDetail {
  id: number;
  name: string;
  industry: string;
  revenue: number;
  company_reg: string;
}

interface CreditScore {
  id: number;
  score: number;
  rating: string;
  created_at: string;
}

interface Invoice {
  id: number;
  client_name: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function LenderSMEDetailPage() {
  const { smeId } = useParams<{ smeId: string }>();
  const navigate = useNavigate();
  const [sme, setSme] = useState<SMEDetail | null>(null);
  const [creditScores, setCreditScores] = useState<CreditScore[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    loadSMEDetails();
  }, [smeId]);

  const loadSMEDetails = async () => {
    try {
      const [smeRes, scoresRes, invoicesRes] = await Promise.all([
        api.get(`/smes/${smeId}`),
        api.get(`/credit-scores/sme/${smeId}`),
        api.get(`/invoices/sme/${smeId}`),
      ]);

      setSme(smeRes.data);
      setCreditScores(scoresRes.data || []);
      setInvoices(invoicesRes.data || []);
      setLoading(false);
    } catch (err) {
      setError("Failed to load SME details");
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 40) return "error";
    if (score < 60) return "warning";
    return "success";
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!sme) return <Typography>SME not found</Typography>;

  const latestScore = creditScores[0];

  return (
    <Box sx={{ p: 3 }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>

      {/* SME Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ mb: 2 }}>
                {sme.name}
              </Typography>
              <Typography>Industry: {sme.industry}</Typography>
              <Typography>Registration #: {sme.company_reg}</Typography>
            </Box>

            <Box>
              <Typography variant="h6">Financial Overview</Typography>
              <Typography sx={{ fontSize: "1.5rem", color: "#2196F3" }}>
                R{sme.revenue.toLocaleString()}
              </Typography>
              <Typography color="textSecondary">Annual Revenue</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Credit Score Card */}
      {latestScore && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Latest Credit Score
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f5f5f5",
                  fontSize: "2rem",
                  fontWeight: "bold",
                }}
              >
                {latestScore.score.toFixed(0)}
              </Box>
              <Box>
                <Chip
                  label={latestScore.rating}
                  color={getRiskColor(latestScore.score) as any}
                  size="medium"
                  sx={{ mb: 1 }}
                />
                <Typography color="textSecondary">
                  Calculated: {new Date(latestScore.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Invoices ({invoices.length})
          </Typography>

          {invoices.length === 0 ? (
            <Typography>No invoices found</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell>Client Name</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.slice(0, 5).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.client_name}</TableCell>
                      <TableCell align="right">
                        R{invoice.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          color={invoice.status === "paid" ? "success" : "warning"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Credit Score History */}
      {creditScores.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Credit Score History
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell>Score</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {creditScores.map((score) => (
                    <TableRow key={score.id}>
                      <TableCell>
                        <Chip
                          label={score.score.toFixed(0)}
                          color={getRiskColor(score.score) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{score.rating}</TableCell>
                      <TableCell>
                        {new Date(score.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
