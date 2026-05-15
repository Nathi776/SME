import React, { useState } from "react";
import { Container, Paper, Stack, TextField, Button, Alert, Typography } from "@mui/material";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { useNavigate } from "react-router-dom";
import { LenderApi } from "../api/lenderApi";

const LenderRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [maxAmount, setMaxAmount] = useState<number | "">("");
  const [minScore, setMinScore] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        organization_name: orgName,
        contact_email: contactEmail,
        phone,
        max_lending_amount: Number(maxAmount) || 0,
        min_credit_score: Number(minScore) || 0,
      };

      // Lender creation typically requires the user to be authenticated. We'll attempt to call the register
      // endpoint; if the backend requires auth, the user should login and complete this step from their account.
      await LenderApi.register(payload);
      // after successful lender registration, navigate to lender dashboard
      navigate("/lender/dashboard");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(formatApiErrorDetail(detail) || err?.message || "Failed to register lender");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Lender registration</Typography>
          {error && <Alert severity="error">{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField label="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
              <TextField label="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <TextField label="Max lending amount" type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value === "" ? "" : Number(e.target.value))} />
              <TextField label="Minimum credit score" type="number" value={minScore} onChange={(e) => setMinScore(e.target.value === "" ? "" : Number(e.target.value))} />

              <Button type="submit" variant="contained" disabled={submitting}>
                Register lender
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
};

export default LenderRegisterPage;
