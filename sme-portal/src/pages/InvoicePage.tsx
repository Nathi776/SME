import { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import { InvoiceAPI } from "../api/invoiceApi";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [client, setClient] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState(0);

  const loadInvoices = async () => {
    const res = await InvoiceAPI.getAll();
    setInvoices(res.data);
  };

  const createInvoice = async () => {
    await InvoiceAPI.create({
      client_name: client,
      description: desc,
      amount,
    });
    setClient("");
    setDesc("");
    setAmount(0);
    loadInvoices();
  };

  const deleteInvoice = async (id: number) => {
    await InvoiceAPI.delete(id);
    loadInvoices();
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  return (
    <Box p={3}>
      <Typography variant="h4">Invoices</Typography>

      <Box mt={2}>
        <TextField label="Client" fullWidth margin="dense"
          value={client} onChange={e => setClient(e.target.value)} />

        <TextField label="Description" fullWidth margin="dense"
          value={desc} onChange={e => setDesc(e.target.value)} />

        <TextField label="Amount" type="number" fullWidth margin="dense"
          value={amount} onChange={e => setAmount(Number(e.target.value))} />

        <Button variant="contained" sx={{ mt: 2 }} onClick={createInvoice}>
          Create Invoice
        </Button>
      </Box>

      <Box mt={4}>
        {invoices.map(inv => (
          <Card key={inv.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography><b>Client:</b> {inv.client_name}</Typography>
              <Typography><b>Amount:</b> R{inv.amount}</Typography>
              <Typography><b>Status:</b> {inv.status}</Typography>

              <Button
                color="error"
                onClick={() => deleteInvoice(inv.id)}
              >
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
