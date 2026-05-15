import { useState } from "react";
import { AuthApi } from "../api/authApi";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await AuthApi.login(username, password);
      const token = res.data.access_token;
      const role = res.data.role;

      // store JWT and role
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("role", role);

      setMessage("Login successful!");
      enqueueSnackbar("Login successful", { variant: "success" });

      const redirectPath =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
        (role === "lender" ? "/lender/dashboard" : "/dashboard");

      navigate(redirectPath, { replace: true });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (Array.isArray(detail)) {
          setMessage(detail.map(d => d.msg).join(", "));
        } else if (typeof detail === "string") {
          setMessage(detail);
        } else {
          setMessage("Login failed.");
        }
        enqueueSnackbar(typeof detail === "string" ? detail : "Login failed", { variant: "error" });
      } else {
        setMessage("Unexpected error.");
        enqueueSnackbar("Unexpected error", { variant: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
        backgroundImage:
          "radial-gradient(circle at top, rgba(37, 99, 235, 0.22), transparent 34%), linear-gradient(135deg, #0f172a 0%, #172554 46%, #020617 100%)",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: "1px solid rgba(255, 255, 255, 0.14)",
            bgcolor: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(18px)",
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 1.4 }}>
                SME Credit Portal
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>
                Welcome back
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Sign in to continue to your finance dashboard.
              </Typography>
            </Box>

            <Box component="form" onSubmit={(event) => { event.preventDefault(); void handleLogin(); }}>
              <Stack spacing={2.5}>
                <TextField
                  label="Username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  autoComplete="username"
                />

                <TextField
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  autoComplete="current-password"
                />

                <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
                  {loading ? "Signing in..." : "Login"}
                </Button>
              </Stack>
            </Box>

            {message ? (
              <Alert severity={message.includes("successful") ? "success" : "error"} variant="outlined">
                {message}
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default LoginPage;
