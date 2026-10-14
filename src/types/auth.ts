export interface User {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string | null;
  role: "super_admin" | "tenant_admin";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  email?: string;
  full_name?: string;
  // No role, tenant_id or is_active: the server refuses all three. See
  // UserUpdate in app/schemas/auth.py for why.
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  // No role or tenant_id: the server assigns both. Signup always produces a
  // tenant_admin with no tenant, and sending them would be ignored anyway.
}
