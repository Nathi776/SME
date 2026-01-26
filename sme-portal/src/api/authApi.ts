import api from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const AuthApi = {
  login: (username: string, password: string) => {
    return api.post<LoginResponse>("/auth/login", {
      username,
      password,
    });
  },

};
