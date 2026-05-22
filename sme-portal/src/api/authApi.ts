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
  register: (username: string, password: string, email: string) => {
    return api.post<{ id: number; username: string; email: string }>("/auth/register", {
      username,
      password,
      email,
    });
  },

};
