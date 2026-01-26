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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { FinanceApi } from "../api/financeApi";

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

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [financeRequests, setFinanceRequests] = useState<FinanceRequest[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<number | "">("");
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const dashboardRes = await api.get("/smes/dashboard");
      const smeId = dashboardRes.data.sme_id;

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

    try {
      setLoading(true);
      const res = await FinanceApi.apply(Number(selectedInvoice), amount);
      setMessage(
        `Finance request submitted! Fee rate: ${(res.data.fee_rate * 100).toFixed(1)}%`
      );
      setSelectedInvoice("");
      setAmount(0);
      setTimeout(() => loadData(), 1500);
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Invoice Finance Request
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert sx={{ mb: 2 }}>{message}</Alert>}

      {/* Request Form */}
      <Card sx={{ mb: 3, p: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Apply for Financing
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Invoice</InputLabel>
            <Select
              value={selectedInvoice}
              onChange={(e) => {
                setSelectedInvoice(e.target.value);
                const selected = invoices.find(
                  (inv) => inv.id === e.target.value
                );
                if (selected) {
                  setAmount(selected.amount);
                }
              }}
              label="Select Invoice"
            >
              {invoices.map((invoice) => (
                <MenuItem key={invoice.id} value={invoice.id}>
                  {invoice.client_name} - R{invoice.amount.toLocaleString()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Financing Amount"
            type="number"
            sx={{ mb: 2 }}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            disabled={!selectedInvoice}
          />

          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || !selectedInvoice}
          >
            {loading ? <CircularProgress size={24} /> : "Submit Request"}
          </Button>
        </CardContent>
      </Card>

      {/* Finance Requests History */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Your Finance Requests
          </Typography>

          {financeRequests.length === 0 ? (
            <Typography>No finance requests yet</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
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
                      <TableCell align="right">
                        R{req.amount_requested.toLocaleString()}
                      </TableCell>
                      <TableCell>{(req.fee_rate * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Chip
                          label={req.status}
                          color={
                            req.status === "approved"
                              ? "success"
                              : req.status === "pending"
                              ? "warning"
                              : "error"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(req.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
