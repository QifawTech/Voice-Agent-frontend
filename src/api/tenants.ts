import client from "./client";
import type {
  Tenant,
  TenantCreate,
  TenantUpdate,
  TenantListResponse,
  SubTenant,
  SubTenantUpdate,
  SubTenantListResponse,
  SubTenantSyncResponse,
} from "@/types/tenant";

export async function listTenants(page = 1, pageSize = 20): Promise<TenantListResponse> {
  const { data } = await client.get<TenantListResponse>("/api/v1/tenants", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function getTenant(id: string): Promise<Tenant> {
  const { data } = await client.get<Tenant>(`/api/v1/tenants/${id}`);
  return data;
}

export async function createTenant(payload: TenantCreate): Promise<Tenant> {
  const { data } = await client.post<Tenant>("/api/v1/tenants", payload);
  return data;
}

export async function updateTenant(id: string, payload: TenantUpdate): Promise<Tenant> {
  const { data } = await client.put<Tenant>(`/api/v1/tenants/${id}`, payload);
  return data;
}

export async function regenerateKey(id: string): Promise<Tenant> {
  const { data } = await client.post<Tenant>(`/api/v1/tenants/${id}/regenerate-key`);
  return data;
}

export async function testConnection(id: string): Promise<{ success: boolean; response_time_ms?: number; error?: string }> {
  const { data } = await client.post(`/api/v1/tenants/${id}/test-connection`);
  return data;
}

export async function getEmbedCode(id: string): Promise<{ embed_code: string; api_key: string }> {
  const { data } = await client.get(`/api/v1/tenants/${id}/embed-code`);
  return data;
}


// ---------------------------------------------------------------------------
// Sub-tenants
//
// There is no create or delete: the customer's API owns the list. A sub-tenant
// appears by being returned from their listing endpoint, and disappears by
// being dropped from it (which deactivates our row, preserving call history).
// ---------------------------------------------------------------------------

/** Pull the sub-tenant list from the customer's API and reconcile it. */
export async function syncSubTenants(tenantId: string): Promise<SubTenantSyncResponse> {
  const { data } = await client.post<SubTenantSyncResponse>(
    `/api/v1/tenants/${tenantId}/sub-tenants/sync`,
  );
  return data;
}

/** Call their listing endpoint and report what came back. Writes nothing. */
export async function testListingEndpoint(tenantId: string): Promise<SubTenantSyncResponse> {
  const { data } = await client.post<SubTenantSyncResponse>(
    `/api/v1/tenants/${tenantId}/sub-tenants/test-endpoint`,
  );
  return data;
}

export async function listSubTenants(
  tenantId: string,
  includeInactive = true,
): Promise<SubTenantListResponse> {
  const { data } = await client.get<SubTenantListResponse>(
    `/api/v1/tenants/${tenantId}/sub-tenants`,
    { params: { include_inactive: includeInactive } },
  );
  return data;
}

/** Update display overrides. name and slug cannot be changed here. */
export async function updateSubTenantOverrides(
  tenantId: string,
  subTenantId: string,
  payload: SubTenantUpdate,
): Promise<SubTenant> {
  const { data } = await client.put<SubTenant>(
    `/api/v1/tenants/${tenantId}/sub-tenants/${subTenantId}`,
    payload,
  );
  return data;
}

export async function getSubTenantEmbedCode(
  tenantId: string,
  subTenantId: string,
): Promise<{ embed_code: string; api_key: string; sub_tenant_slug: string }> {
  const { data } = await client.get(
    `/api/v1/tenants/${tenantId}/sub-tenants/${subTenantId}/embed-code`,
  );
  return data;
}
