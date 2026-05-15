import React, { useState } from "react";
import {
  Container,
  Paper,
  Stack,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AuthApi } from "../api/authApi";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { login as autoLogin } from "../utils/auth";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"sme" | "lender">("sme");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRoleChange = (e: SelectChangeEvent) => {
    setRole(e.target.value as "sme" | "lender");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await AuthApi.register(username, password, email);
      const userId = res.data?.id;
      // store the new user id temporarily so the next step can use it
      if (userId) sessionStorage.setItem("justRegisteredUserId", String(userId));
      // auto-login the user so we can proceed to role-specific registration
      try {
        await autoLogin(username, password);
      } catch (loginErr) {
        // ignore - user can login manually
      }

      if (role === "sme") {
        navigate("/register/sme");
      } else {
        navigate("/register/lender");
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(formatApiErrorDetail(detail) || err?.message || "Registration failed");
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

            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <FormControl>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                value={role}
                label="Role"
                onChange={handleRoleChange}
              >
                <MenuItem value="sme">SME</MenuItem>
                <MenuItem value="lender">Lender</MenuItem>
              </Select>
            </FormControl>

            <Button type="submit" variant="contained" disabled={submitting}>
              Create account
            </Button>

            <Button variant="text" onClick={() => navigate('/login')}>
              Already have an account? Login
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
