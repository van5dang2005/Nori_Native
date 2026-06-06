import api from "./api";

export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface Role{
  id: number;
  name: string;
  guard_name: string;
  created_at: string; // ISO string
  updated_at: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  img?: string;
  roles: Role[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const login = async (data: LoginPayload): Promise<AuthResponse> => {
  const res = await api.post("/login", data);
  return res.data;
};
export const register = async (data: RegisterPayload): Promise<AuthResponse> => {
  const res = await api.post("/register", data);
  return res.data;
};
export const logout = async () => {
  const res = await api.post("/logout");
  return res.data;
};
