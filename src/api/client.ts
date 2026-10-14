import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const { token, isTokenExpired, logout } = useAuthStore.getState();
  if (token && isTokenExpired()) {
    logout();
    return Promise.reject(new axios.Cancel("Token expired"));
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== "/login") {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

export default client;
