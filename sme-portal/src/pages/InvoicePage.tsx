import { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Container,
  Stack,
  Chip,
} from "@mui/material";
import api from "../api/client";
import { invoiceApi } from "../api/invoiceApi";
import { formatZAR } from "../utils/format";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [client, setClient] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const loadInvoices = async () => {
    const dash = await api.get("/smes/dashboard");

    const smeId = dash.data.sme_id;

    const res = await invoiceApi.listBySme(smeId);

    setInvoices(res.data);
  };

  const createInvoice = async () => {
    await invoiceApi.create({
      client_name: client,
      description: desc,
      amount: Number(amount),
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    setClient("");
    setDesc("");
    setAmount("");
    setInvoiceCreated(true);
    enqueueSnackbar("Invoice created", { variant: "success" });
    loadInvoices();
  };

  const deleteInvoice = async (id: number) => {
    await invoiceApi.delete(id);
    enqueueSnackbar("Invoice deleted", { variant: "success" });
    loadInvoices();
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Invoices</Typography>
            <Typography color="text.secondary">Create and manage customer invoices.</Typography>
          </Box>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Create Invoice</Typography>
              <Stack spacing={2}>
                <TextField label="Client" fullWidth value={client} onChange={(e) => setClient(e.target.value)} />
                <TextField label="Description" fullWidth value={desc} onChange={(e) => setDesc(e.target.value)} />
                <TextField label="Amount" type="number" fullWidth value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                <Box>
                  <Button variant="contained" onClick={createInvoice}>Create Invoice</Button>
                </Box>
                {invoiceCreated && (
                  <Box>
                    <Button variant="outlined" onClick={() => navigate("/dashboard")}>Back to SME Dashboard</Button>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={2}>
            {invoices.map((inv) => (
              <Card key={inv.id} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{inv.client_name}</Typography>
                      <Typography color="text.secondary">{inv.description}</Typography>
                      <Typography sx={{ mt: 1 }}>{formatZAR(inv.amount)}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={inv.status} color={inv.status === "paid" ? "success" : inv.status === "overdue" ? "error" : "warning"} size="small" />
                      <Button color="error" onClick={() => deleteInvoice(inv.id)}>Delete</Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
