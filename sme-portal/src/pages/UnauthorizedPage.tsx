import { Button, Container, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Stack spacing={3} alignItems="flex-start">
        <Typography variant="h3" fontWeight={700}>
          Access denied
        </Typography>
        <Typography color="text.secondary">
          Your account does not have permission to view this page.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/login")}>Back to login</Button>
      </Stack>
    </Container>
  );
}