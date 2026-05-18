import { AuthApi } from "../api/authApi";

export const setToken = (token: string) => {
  sessionStorage.setItem("token", token);
};

export const getToken = () => sessionStorage.getItem("token");

export const setRole = (role: string) => sessionStorage.setItem("role", role);
export const getRole = () => sessionStorage.getItem("role");

export const logout = () => {
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = "/login";
};

export const login = async (username: string, password: string) => {
  const res = await AuthApi.login(username, password);
  const token = res.data?.access_token;
  const role = res.data?.role;
  if (token) setToken(token);
  if (role) setRole(role);
  return res;
};

const auth = {
  setToken,
  getToken,
  setRole,
  getRole,
  logout,
  login,
};

export default auth;
