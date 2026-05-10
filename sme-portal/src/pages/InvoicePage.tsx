import { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import api from "../api/client";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [client, setClient] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | "">("");

  const loadInvoices = async () => {
    const dash = await api.get("/smes/dashboard");

    const smeId = dash.data.sme_id;

    const res = await api.get(`/invoices/sme/${smeId}`);

    setInvoices(res.data);
  };

  const createInvoice = async () => {
    const dash = await api.get("/smes/dashboard");

    const smeId = dash.data.sme_id;

    await api.post(
      "/invoices/",
      {
        sme_id: smeId,
        client_name: client,
        description: desc,
        amount,
      }
    );

    setClient("");
    setDesc("");
    setAmount("");
    loadInvoices();
  };

  const deleteInvoice = async (id: number) => {
    await api.delete(`/invoices/${id}`);
    loadInvoices();
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  return (
    <Box p={3}>
      <Typography variant="h4">Invoices</Typography>

      {/* CREATE */}
      <Box mt={2}>
        <TextField
          label="Client"
          fullWidth
          margin="dense"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />

        <TextField
          label="Description"
          fullWidth
          margin="dense"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <TextField
          label="Amount"
          type="number"
          fullWidth
          margin="dense"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />

        <Button variant="contained" sx={{ mt: 2 }} onClick={createInvoice}>
          Create Invoice
        </Button>
      </Box>

      {/* LIST */}
      <Box mt={4}>
        {invoices.map((inv) => (
          <Card key={inv.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography><b>Client:</b> {inv.client_name}</Typography>
              <Typography><b>Description:</b> {inv.description}</Typography>
              <Typography><b>Amount:</b> R {inv.amount}</Typography>
              <Typography><b>Status:</b> {inv.status}</Typography>

              <Button color="error" onClick={() => deleteInvoice(inv.id)}>
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
