import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "blog_token";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getErrorMessage = (err: unknown): string => {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string; details?: Record<string, string[]> } | undefined;
    const first = data?.details && Object.values(data.details).flat()[0];
    return first ? `${data?.message}: ${first}` : (data?.message ?? err.message);
  }
  return err instanceof Error ? err.message : "Something went wrong";
};
