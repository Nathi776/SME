import React, { useState } from "react";
import { Container, Paper, Stack, TextField, Button, Alert } from "@mui/material";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { useNavigate } from "react-router-dom";
import { SMEApi } from "../api/smeApi";

const SmeRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [revenue, setRevenue] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const userId = sessionStorage.getItem("justRegisteredUserId");
      const payload: any = {
        name,
        industry,
        revenue: Number(revenue) || 0,
      };
      if (userId) payload.user_id = Number(userId);

      await SMEApi.create(payload);
      // done, clear temporary storage and navigate to SME dashboard
      sessionStorage.removeItem("justRegisteredUserId");
      navigate("/dashboard");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(formatApiErrorDetail(detail) || err?.message || "Failed to create SME profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField label="SME name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            <TextField
              label="Annual Revenue"
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value === "" ? "" : Number(e.target.value))}
            />

            <Button type="submit" variant="contained" disabled={submitting}>
              Create SME profile
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default SmeRegisterPage;
