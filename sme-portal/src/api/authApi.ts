import api from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
}

export const AuthApi = {
  // identifier may be a username or an email. If it looks like an email, send as `email`.
  login: (identifier: string, password: string) => {
    const payload: any = { password };
    if (identifier.includes("@")) payload.email = identifier;
    else payload.username = identifier;

    return api.post<LoginResponse>("/auth/login", payload);
  },
  register: (username: string, password: string, email: string, role: "sme" | "lender" = "sme") => {
    return api.post<{ id: number; username: string; email: string; role: "sme" | "lender" }>("/auth/register", {
      username,
      password,
      email,
      role,
    });
  },

  // Request server to send verification codes. Identifier may be a user id (number) or email (string).
  sendVerification: (identifier: number | string, channels: string[] = ["email", "phone"]) => {
    const payload: any = { channels };
    if (typeof identifier === "number") payload.user_id = identifier;
    else payload.email = identifier;

    return api.post("/auth/send-verification", payload);
  },

  // Resend a single-channel verification code (e.g. 'email' or 'phone').
  resendVerification: (identifier: number | string, channel: string) => {
    const payload: any = { channel };
    if (typeof identifier === "number") payload.user_id = identifier;
    else payload.email = identifier;

    return api.post("/auth/resend-verification", payload);
  },

  // Verify an OTP code for an identifier and channel.
  verifyOtp: (identifier: number | string, channel: string, code: string) => {
    const payload: any = { channel, code };
    if (typeof identifier === "number") payload.user_id = identifier;
    else payload.email = identifier;

    return api.post("/auth/verify", payload);
  },

};
