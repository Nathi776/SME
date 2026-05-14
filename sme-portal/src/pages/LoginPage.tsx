import { useState } from "react";
import { AuthApi } from "../api/authApi";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";

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
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>
          Sign in to your SME Credit Portal
        </p>

        <div style={styles.field}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        {message && (
          <p
            style={{
              ...styles.message,
              color: message.includes("successful") ? "#16a34a" : "#dc2626",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f172a, #020617)",
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#ffffff",
    borderRadius: 12,
    padding: "2.5rem",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  title: {
    margin: 0,
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#020617",
  },
  subtitle: {
    marginTop: "0.5rem",
    marginBottom: "2rem",
    color: "#475569",
    fontSize: "0.95rem",
  },
  field: {
    marginBottom: "1.25rem",
  },
  label: {
    display: "block",
    marginBottom: "0.4rem",
    fontSize: "0.85rem",
    color: "#334155",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: 8,
    border: "1px solid #cbd5f5",
    fontSize: "0.95rem",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "0.85rem",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 600,
    marginTop: "0.5rem",
  },
  message: {
    marginTop: "1rem",
    fontSize: "0.9rem",
    textAlign: "center",
  },
};

export default LoginPage;
