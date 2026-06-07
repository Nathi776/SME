import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Container,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { FinanceApi } from "../api/financeApi";
import { useSnackbar } from "notistack";
import { formatZAR } from "../utils/format";
import { formatApiErrorDetail } from "../utils/formatApiError";

interface Invoice {
  id: number;
  client_name: string;
  amount: number;
  status: string;
}

interface FinanceRequest {
  id: number;
  amount_requested: number;
  fee_rate: number;
  status: string;
  created_at: string;
}

export default function FinanceRequestPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [financeRequests, setFinanceRequests] = useState<FinanceRequest[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<number | "">("");
  const [amount, setAmount] = useState<number>(0);
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const calculateEligibleAmount = (invoiceAmount: number, score: number | null) => {
    if (score === null || score < 40) return invoiceAmount * 0.6;
    if (score < 60) return invoiceAmount * 0.7;
    if (score < 80) return invoiceAmount * 0.8;
    return invoiceAmount * 0.9;
  };

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const dashboardRes = await api.get("/smes/dashboard");
      const smeId = dashboardRes.data.sme_id;
      setCreditScore(dashboardRes.data.credit_score ?? null);

      const [invoicesRes, requestsRes] = await Promise.all([
        api.get(`/invoices/sme/${smeId}`),
        api.get(`/finance/requests/${smeId}`),
      ]);

      setInvoices(invoicesRes.data.filter((inv: Invoice) => inv.status !== "paid"));
      setFinanceRequests(requestsRes.data);
    } catch (err) {
      setError("Failed to load data");
    }
  };

  const handleSubmit = async () => {
    if (!selectedInvoice) {
      setMessage("Please select an invoice");
      return;
    }

    if (amount <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    const selected = invoices.find((inv) => inv.id === Number(selectedInvoice));
    const eligibleAmount = selected ? calculateEligibleAmount(selected.amount, creditScore) : 0;

    if (selected && amount > eligibleAmount) {
      setMessage(`Requested amount cannot exceed eligible maximum of ${formatZAR(eligibleAmount)}`);
      return;
    }

    try {
      setLoading(true);
      const res = await FinanceApi.apply(Number(selectedInvoice), amount);
      setMessage(`Finance request submitted! Fee rate: ${(res.data.fee_rate * 100).toFixed(1)}%`);
      enqueueSnackbar("Finance request submitted", { variant: "success" });
      setSelectedInvoice("");
      setAmount(0);
      setTimeout(() => loadData(), 1500);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const text = formatApiErrorDetail(detail) || "Request failed.";
      setMessage(text);
      enqueueSnackbar(text, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Invoice Finance Request
            </Typography>
            <Typography color="text.secondary">
              Request financing against eligible unpaid invoices.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity={message.toLowerCase().includes("submitted") ? "success" : "info"}>{message}</Alert>}

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Apply for Financing
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Invoice</InputLabel>
                <Select
                  value={selectedInvoice}
                  onChange={(e) => {
                    const invoiceId = Number(e.target.value);
                    setSelectedInvoice(invoiceId);
                    const selected = invoices.find((inv) => inv.id === invoiceId);
                    if (selected) {
                      setAmount(selected.amount);
                    }
                  }}
                  label="Select Invoice"
                >
                  {invoices.map((invoice) => (
                    <MenuItem key={invoice.id} value={invoice.id}>
                      {invoice.client_name} - {formatZAR(invoice.amount)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedInvoice && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Eligible maximum for this invoice: {formatZAR(
                    calculateEligibleAmount(
                      invoices.find((inv) => inv.id === Number(selectedInvoice))?.amount || 0,
                      creditScore,
                    )
                  )}
                  {creditScore !== null ? ` based on your credit score of ${creditScore.toFixed(0)}` : " based on a default risk profile"}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Financing Amount"
                type="number"
                sx={{ mb: 2 }}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={!selectedInvoice}
                inputProps={{
                  max: selectedInvoice
                    ? calculateEligibleAmount(
                        invoices.find((inv) => inv.id === Number(selectedInvoice))?.amount || 0,
                        creditScore,
                      )
                    : undefined,
                }}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleSubmit}
                disabled={loading || !selectedInvoice}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Submit Request"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Your Finance Requests
              </Typography>

              {financeRequests.length === 0 ? (
                <Typography color="text.secondary">No finance requests yet</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Request ID</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Fee Rate</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Submitted</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {financeRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>#{req.id}</TableCell>
                          <TableCell align="right">{formatZAR(req.amount_requested)}</TableCell>
                          <TableCell>{(req.fee_rate * 100).toFixed(1)}%</TableCell>
                          <TableCell>
                            <Chip
                              label={req.status}
                              color={
                                req.status === "completed"
                                  ? "success"
                                  : req.status === "funded"
                                  ? "info"
                                  : req.status === "approved"
                                  ? "primary"
                                  : req.status === "pending"
                                  ? "warning"
                                  : "error"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
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
