import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { FinanceApi } from "../api/financeApi";

export default function FinanceRequestPage() {
  const navigate = useNavigate();

  const [amount, setAmount] = useState<number>(0);
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("You must be logged in.");
      return;
    }

    try {
      setLoading(true);

      // SME ID is derived from backend session
      const dashboardRes = await fetch(
        "http://localhost:8000/smes/dashboard",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await dashboardRes.json();
      const smeId = data.sme_id;

      await FinanceApi.apply(smeId, amount, purpose);

      setMessage("Finance request submitted successfully!");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3} maxWidth={500}>
      <Typography variant="h4" gutterBottom>
        Request Finance
      </Typography>

      {message && <Alert sx={{ mb: 2 }}>{message}</Alert>}

      <TextField
        fullWidth
        label="Amount Requested"
        type="number"
        margin="normal"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />

      <TextField
        fullWidth
        label="Purpose"
        margin="normal"
        multiline
        rows={3}
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
      />

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        disabled={loading}
        onClick={handleSubmit}
      >
        Submit Request
      </Button>
    </Box>
  );
}
