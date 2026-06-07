import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { VerificationApi, VerificationRecord } from "../api/verificationApi";

const verificationOptions = [
  { value: "cipc", label: "CIPC Certificate" },
  { value: "tax_clearance", label: "Tax Clearance" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "financial_license", label: "Financial License" },
  { value: "registration_docs", label: "Registration Docs" },
  { value: "banking_docs", label: "Banking Docs" },
];

export default function DocumentsPage() {
  const [docType, setDocType] = useState("cipc");
  const [documentUrl, setDocumentUrl] = useState("");
  const [items, setItems] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const res = await VerificationApi.myVerifications();
      setItems(res.data || []);
    } catch (err) {
      setMessage("Could not load your verification documents.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const groupedLabel = useMemo(() => {
    const selected = verificationOptions.find((option) => option.value === docType);
    return selected ? selected.label : docType;
  }, [docType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    try {
      setSubmitting(true);
      await VerificationApi.submit({ doc_type: docType, document_url: documentUrl || undefined });
      setDocumentUrl("");
      setMessage(`${groupedLabel} submitted for review.`);
      await loadVerifications();
    } catch (err) {
      setMessage("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Documents</Typography>
        <Typography variant="body2" color="text.secondary">
          Submit compliance documents and track their review status.
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack component="form" spacing={2} onSubmit={handleSubmit} sx={{ mb: 4 }}>
            <TextField
              select
              label="Document type"
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
              fullWidth
            >
              {verificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Document URL"
              value={documentUrl}
              onChange={(event) => setDocumentUrl(event.target.value)}
              placeholder="https://..."
              fullWidth
              helperText="Store the uploaded file in your preferred storage and paste the public or signed URL here."
            />

            <Button type="submit" variant="contained" disabled={submitting} sx={{ alignSelf: "flex-start" }}>
              {submitting ? "Submitting..." : "Submit Document"}
            </Button>
          </Stack>

          {message && <Alert severity="info" sx={{ mb: 3 }}>{message}</Alert>}

          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Your submissions</Typography>
            {loading && <Typography variant="body2" color="text.secondary">Loading submissions...</Typography>}
            {!loading && items.length === 0 && (
              <Typography variant="body2" color="text.secondary">No verification submissions yet.</Typography>
            )}
            {items.map((item) => {
              const option = verificationOptions.find((entry) => entry.value === item.doc_type);
              return (
                <Stack
                  key={item.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}
                >
                  <div>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{option?.label || item.doc_type}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Submitted {new Date(item.submitted_at).toLocaleString()}
                    </Typography>
                    {item.reviewer_notes && (
                      <Typography variant="body2" color="text.secondary">
                        Reviewer notes: {item.reviewer_notes}
                      </Typography>
                    )}
                  </div>
                  <Chip label={item.status} color={item.status === "approved" ? "success" : item.status === "rejected" ? "error" : "warning"} />
                </Stack>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
