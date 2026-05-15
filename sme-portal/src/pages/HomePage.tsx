import React from "react";
import { Container, Typography, Stack, Button, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="h3">SME Finance Portal</Typography>
          <Typography variant="body1" sx={{ textAlign: "center" }}>
            Manage invoices, requests, and lending — a single place for SMEs and
            Lenders to interact.
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button variant="outlined" color="primary" onClick={() => navigate('/register')}>
              Register
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            If you're an SME or Lender, please register and then complete your
            profile.
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
};

export default HomePage;
