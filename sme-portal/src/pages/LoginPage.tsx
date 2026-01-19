import { useState } from "react";
import { AuthApi } from "../api/authApi";
import axios from "axios";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      const res = await AuthApi.login(username, password);
      const token = res.data.access_token;

      // store JWT
      localStorage.setItem("token", token);

      setMessage("Login successful!");
      window.location.href = "/dashboard"; // redirect
    }catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (Array.isArray(detail)) {
          setMessage(detail.map(d => d.msg).join(", "));
        } else if (typeof detail === "string") {
          setMessage(detail);
        } else {
          setMessage("Login failed.");
        }
      } else {
        setMessage("Unexpected error.");
      }
    }

  };

  return (
    <div style={{ padding: 20, maxWidth: 400 }}>
      <h1>Login</h1>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <br />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />

      <button onClick={handleLogin}>Login</button>

      <p>{message}</p>
    </div>
  );
}

export default LoginPage;
