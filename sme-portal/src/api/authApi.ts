import api from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const AuthApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>("/auth/login", null, {
      params: { username, password },
    }),
};
