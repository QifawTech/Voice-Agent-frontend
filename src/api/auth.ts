import client from "./client";
import type {
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  UpdateProfilePayload,
  User,
} from "@/types/auth";

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>("/api/v1/auth/login", payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const { data } = await client.post<User>("/api/v1/auth/register", payload);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>("/api/v1/auth/me");
  return data;
}

export async function updateMe(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await client.put<User>("/api/v1/auth/me", payload);
  return data;
}

/** Resolves on success; the endpoint returns 204 with no body. */
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await client.post("/api/v1/auth/change-password", payload);
}
