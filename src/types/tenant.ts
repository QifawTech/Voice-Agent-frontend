/**
 * "single" = one product, no sub-tenants. Config lives on the tenant.
 * "multi"  = many sub-tenants, ALL served by the same one API. The
 *            sub-tenant is chosen by sending its slug to that API.
 */
export type TenancyType = "single" | "multi";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  platform: "sopzy" | "standalone" | "custom";
  tenancy_type: TenancyType;
  api_base_url: string | null;
  api_validated: boolean;
  widget_api_key: string | null;
  upi_id: string | null;
  voice_config: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantCreate {
  name: string;
  slug: string;
  platform?: string;
  tenancy_type?: TenancyType;
  api_base_url?: string;
  api_auth_token?: string;
  upi_id?: string;
  voice_config?: Record<string, unknown>;
}

export interface TenantUpdate {
  name?: string;
  slug?: string;
  platform?: string;
  tenancy_type?: TenancyType;
  api_base_url?: string;
  api_auth_token?: string;
  upi_id?: string;
  voice_config?: Record<string, unknown>;
  is_active?: boolean;
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * How a tenant's opening greeting is produced.
 * - "api"     → fetched live from the tenant's own API (e.g. menu size, best
 *               sellers) via the get_greeting tool.
 * - "default" → a static welcome the tenant typed, using their name.
 */
export type GreetingMode = "api" | "default";

/** Stored under voice_config.greeting_setup. Absent = never set up. */
export interface GreetingSetup {
  mode: GreetingMode;
  configured: boolean;
}

/**
 * Read a completed greeting setup out of a tenant's voice_config, or null when
 * the tenant has not finished setup yet (which is when the popup must appear).
 */
export function readGreetingSetup(
  voiceConfig: Record<string, unknown> | null | undefined,
): GreetingSetup | null {
  const g = (voiceConfig as { greeting_setup?: unknown } | null | undefined)
    ?.greeting_setup as Partial<GreetingSetup> | undefined;
  if (g && (g.mode === "api" || g.mode === "default") && g.configured === true) {
    return { mode: g.mode, configured: true };
  }
  return null;
}

/** The static welcome text currently stored (default-mode greeting). */
export function readDefaultGreeting(
  voiceConfig: Record<string, unknown> | null | undefined,
): string {
  const g = (voiceConfig as { greeting?: unknown } | null | undefined)?.greeting;
  return typeof g === "string" ? g : "";
}


/**
 * One tenant of a multi-tenant customer.
 *
 * `name` and `slug` are owned by the customer's own API and refreshed by the
 * sync — they are read-only here. Only upi_id and voice_config are editable,
 * and a null value means "inherit from the parent tenant".
 */
export interface SubTenant {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  upi_id: string | null;
  voice_config: Record<string, unknown> | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Display overrides only — name and slug deliberately absent. */
export interface SubTenantUpdate {
  upi_id?: string | null;
  voice_config?: Record<string, unknown> | null;
  is_active?: boolean;
}

export interface SubTenantListResponse {
  sub_tenants: SubTenant[];
  total: number;
}

/** Why a sync or endpoint test failed, in terms a developer can act on. */
export interface SyncDiagnostic {
  reason:
    | "ok"
    | "not_configured"
    | "not_found"
    | "unauthorized"
    | "timeout"
    | "unreachable"
    | "bad_shape"
    | "empty"
    | "server_error";
  message: string;
  url_called: string | null;
  status_code: number | null;
  /** First 200 chars of what their API actually returned. */
  raw_response: string | null;
}

export interface SubTenantSyncResponse {
  success: boolean;
  created: number;
  updated: number;
  deactivated: number;
  total_active: number;
  sub_tenants: SubTenant[];
  diagnostic: SyncDiagnostic | null;
}
