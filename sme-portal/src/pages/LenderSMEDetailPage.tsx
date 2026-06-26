import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import api from "../api/client";
import { formatZAR } from "../utils/format";

interface SMEDetail {
  id: number;
  name: string;
  industry: string;
  revenue: number;
}

interface CreditScore {
  id: number;
  score: number;
  rating: string | number | null;
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

  const loadSMEDetails = useCallback(async () => {
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
  }, [smeId]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    loadSMEDetails();
  }, [loadSMEDetails, navigate]);

  const getRiskColor = (score: number) => {
    if (score < 40) return "error";
    if (score < 60) return "warning";
    return "success";
  };

  const getRiskLabel = (score: number | null | undefined, rating: string | number | null) => {
    if (typeof rating === "string" && rating.trim()) {
      return rating;
    }

    if (score == null) {
      return "N/A";
    }

    if (score < 40) return "High";
    if (score < 60) return "Medium";
    return "Low";
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!sme) return <Typography>SME not found</Typography>;

  const latestScore = creditScores[0];

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Box sx={{ px: { xs: 2, md: 4 } }}>
        <Button variant="outlined" onClick={() => navigate("/lender/dashboard")} sx={{ mb: 3 }}>
          Back to Dashboard
        </Button>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 800 }}>
                  {sme.name}
                </Typography>
                <Typography color="text.secondary">Industry: {sme.industry}</Typography>
              </Box>

              <Box>
                <Typography variant="h6">Financial Overview</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: 0.5, fontWeight: 800 }}>
                  {formatZAR(sme.revenue)}
                </Typography>
                <Typography color="text.secondary">Annual Revenue</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {latestScore && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Latest Credit Score
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ width: 100, height: 100, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", fontSize: "2rem", fontWeight: 800, color: "text.primary", border: "1px solid", borderColor: "divider" }}>
                  {latestScore.score.toFixed(0)}
                </Box>
                <Box>
                  <Chip label={getRiskLabel(latestScore.score, latestScore.rating)} color={getRiskColor(latestScore.score) as any} size="medium" sx={{ mb: 1 }} />
                  <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                    Calculated: {new Date(latestScore.created_at).toLocaleDateString()}
                  </Typography>
                  <Button variant="outlined" size="small" onClick={() => navigate(`/lender/sme/${smeId}/credit-score`)} sx={{ textTransform: "none", borderRadius: "8px" }}>
                    View Detailed Explanation
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Recent Invoices ({invoices.length})
            </Typography>

            {invoices.length === 0 ? (
              <Typography color="text.secondary">No invoices found</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
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
                        <TableCell align="right">R{invoice.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip label={invoice.status} color={invoice.status === "paid" ? "success" : "warning"} size="small" />
                        </TableCell>
                        <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {creditScores.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Credit Score History
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Score</TableCell>
                      <TableCell>Rating</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {creditScores.map((score) => (
                      <TableRow key={score.id}>
                        <TableCell>
                          <Chip label={score.score.toFixed(0)} color={getRiskColor(score.score) as any} size="small" />
                        </TableCell>
                        <TableCell>{getRiskLabel(score.score, score.rating)}</TableCell>
                        <TableCell>{new Date(score.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
