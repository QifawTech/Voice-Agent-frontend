import { create } from "zustand";
import type { User } from "@/types/auth";
import * as authApi from "@/api/auth";
import axios from "axios";

interface AuthState {
  token: string | null;
  tokenExpiresAt: number | null;
  user: User | null;
  loading: boolean;
  userLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  /** Replace the cached profile after the user edits it on the Settings page. */
  setUser: (user: User) => void;
  isTokenExpired: () => boolean;
}

function getStoredExpiry(): number | null {
  const v = localStorage.getItem("token_expires_at");
  return v ? Number(v) : null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("token"),
  tokenExpiresAt: getStoredExpiry(),
  user: null,
  loading: false,
  userLoading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await authApi.login({ email, password });
      const expiresAt = Date.now() + res.expires_in * 1000;
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("token_expires_at", String(expiresAt));
      set({ token: res.access_token, tokenExpiresAt: expiresAt, user: res.user, loading: false });
    } catch (err) {
      set({ loading: false });
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        throw new Error(err.response.data.detail);
      }
      throw new Error("Login failed. Please try again.");
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expires_at");
    set({ token: null, tokenExpiresAt: null, user: null });
  },

  setUser: (user) => set({ user }),

  loadUser: async () => {
    if (get().isTokenExpired()) {
      get().logout();
      return;
    }
    set({ userLoading: true });
    try {
      const user = await authApi.getMe();
      set({ user, userLoading: false });
    } catch {
      set({ userLoading: false });
      get().logout();
    }
  },

  isTokenExpired: () => {
    const { tokenExpiresAt } = get();
    if (!tokenExpiresAt) return false;
    return Date.now() >= tokenExpiresAt - 60_000;
  },
}));
