import React from "react";
import { Container, Card, CardContent, Typography, Stack, Button, TextField } from "@mui/material";

const messages = [
  { from: "Support", body: "Your verification documents are under review.", time: "10 min ago" },
  { from: "Lender Team", body: "Please share your latest bank statement.", time: "Yesterday" },
  { from: "Finance Ops", body: "Your funded invoice has been marked as complete.", time: "2 days ago" },
];

export default function MessagesPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Messages</Typography>
        <Typography variant="body2" color="text.secondary">
          Keep communication with support, lenders, and finance operations in one place.
        </Typography>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            {messages.map((message) => (
              <Stack key={`${message.from}-${message.time}`} spacing={0.5} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{message.from}</Typography>
                  <Typography variant="caption" color="text.secondary">{message.time}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">{message.body}</Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField fullWidth label="New message" multiline minRows={3} placeholder="Type your question or update here" />
            <Button variant="contained" sx={{ alignSelf: "flex-start" }}>Send Message</Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
