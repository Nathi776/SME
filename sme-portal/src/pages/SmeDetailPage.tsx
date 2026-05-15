import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SMEApi } from "../api/smeApi";
import axios from "axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { formatZAR } from "../utils/format";

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

  const loadData = useCallback(async () => {
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
  }, [smeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <p>Loading SME data...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!sme) return <p>No SME found.</p>;

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              SME: {sme.name}
            </Typography>
            <Typography color="text.secondary">Industry: {sme.industry}</Typography>
          </Box>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Credit Score
              </Typography>
              {!creditScore ? (
                <Typography color="text.secondary">No credit score available.</Typography>
              ) : (
                <Stack spacing={0.5}>
                  <Typography>Score: {creditScore.score}</Typography>
                  <Typography>Rating: {creditScore.rating}</Typography>
                  <Typography>Last Updated: {creditScore.last_updated}</Typography>
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Invoices
              </Typography>
              {invoices.length === 0 ? (
                <Typography color="text.secondary">No invoices found.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Due Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>{inv.id}</TableCell>
                          <TableCell>{formatZAR(inv.amount)}</TableCell>
                          <TableCell>
                            <Chip label={inv.status} color={inv.status === "paid" ? "success" : inv.status === "overdue" ? "error" : "warning"} size="small" />
                          </TableCell>
                          <TableCell>{inv.due_date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Finance Requests
              </Typography>
              {financeRequests.length === 0 ? (
                <Typography color="text.secondary">No finance requests found.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Amount Requested</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Decision</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {financeRequests.map((fr) => (
                        <TableRow key={fr.id}>
                          <TableCell>{fr.id}</TableCell>
                          <TableCell>{formatZAR(fr.amount_requested)}</TableCell>
                          <TableCell>
                            <Chip label={fr.status} color={fr.status === "approved" ? "success" : fr.status === "rejected" ? "error" : "warning"} size="small" />
                          </TableCell>
                          <TableCell>{fr.decision || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}

export default SmeDetailPage;
