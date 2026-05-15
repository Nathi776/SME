import api from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
}

export const AuthApi = {
  login: (username: string, password: string) => {
    return api.post<LoginResponse>("/auth/login", {
      username,
      password,
    });
  },
  register: (username: string, password: string, email: string) => {
    return api.post<{ id: number; username: string; email: string }>("/auth/register", {
      username,
      password,
      email,
    });
  },

};
