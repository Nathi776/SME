import React from "react";
import { Container, Card, CardContent, Typography, Stack, Button } from "@mui/material";

const transactions = [
  { title: "Invoice financing payout", amount: "R125,000", date: "Jun 4" },
  { title: "Platform fee", amount: "-R3,250", date: "Jun 4" },
  { title: "Repayment received", amount: "R40,000", date: "Jun 2" },
];

export default function TransactionsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Transactions</Typography>
        <Typography variant="body2" color="text.secondary">
          Review cash movement tied to invoices, repayments, and platform fees.
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            {transactions.map((tx) => (
              <Stack
                key={`${tx.title}-${tx.date}`}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 2 }}
              >
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{tx.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{tx.date}</Typography>
                </div>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{tx.amount}</Typography>
              </Stack>
            ))}
          </Stack>
          <Button variant="outlined" sx={{ mt: 3 }}>Download Statement</Button>
        </CardContent>
      </Card>
    </Container>
  );
}
