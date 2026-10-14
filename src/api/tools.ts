import client from "./client";
import type {
  Tool,
  ToolCreate,
  ToolListResponse,
  ToolPresetListResponse,
  ToolTestRequest,
  ToolTestResponse,
  ToolUpdate,
} from "@/types/tool";

// ---------------------------------------------------------------------------
// Tools
//
// The function tools a tenant's voice agent can call. Unlike sub-tenants,
// these are ours to create and delete: the tenant authors them here, and the
// agent picks up a change on its next call.
// ---------------------------------------------------------------------------

export async function listTools(tenantId: string): Promise<ToolListResponse> {
  const { data } = await client.get<ToolListResponse>(
    `/api/v1/tenants/${tenantId}/tools`,
  );
  return data;
}

export async function createTool(
  tenantId: string,
  payload: ToolCreate,
): Promise<Tool> {
  const { data } = await client.post<Tool>(
    `/api/v1/tenants/${tenantId}/tools`,
    payload,
  );
  return data;
}

/** Partial update — only the fields present in `payload` change. */
export async function updateTool(
  tenantId: string,
  toolId: string,
  payload: ToolUpdate,
): Promise<Tool> {
  const { data } = await client.put<Tool>(
    `/api/v1/tenants/${tenantId}/tools/${toolId}`,
    payload,
  );
  return data;
}

export async function deleteTool(
  tenantId: string,
  toolId: string,
): Promise<void> {
  await client.delete(`/api/v1/tenants/${tenantId}/tools/${toolId}`);
}

/** Discard edits to a built-in tool and restore its shipped definition. */
export async function resetTool(
  tenantId: string,
  toolId: string,
): Promise<Tool> {
  const { data } = await client.post<Tool>(
    `/api/v1/tenants/${tenantId}/tools/${toolId}/reset`,
  );
  return data;
}

// ---- Presets ----

/** The standard restaurant tools, and which this tenant already has. */
export async function listToolPresets(
  tenantId: string,
): Promise<ToolPresetListResponse> {
  const { data } = await client.get<ToolPresetListResponse>(
    `/api/v1/tenants/${tenantId}/tools/presets`,
  );
  return data;
}

/**
 * Install presets. Omit `names` to install every missing one.
 * Already-installed tools are left untouched — this never overwrites an edit.
 */
export async function installToolPresets(
  tenantId: string,
  names?: string[],
): Promise<ToolListResponse> {
  const { data } = await client.post<ToolListResponse>(
    `/api/v1/tenants/${tenantId}/tools/install-presets`,
    { names: names ?? null },
  );
  return data;
}

// ---- Test ----

/**
 * Run a tool against the tenant's real API, as the agent would.
 *
 * This is a live call, not a dry run: testing create_order places an order.
 */
export async function testTool(
  tenantId: string,
  toolId: string,
  payload: ToolTestRequest,
): Promise<ToolTestResponse> {
  const { data } = await client.post<ToolTestResponse>(
    `/api/v1/tenants/${tenantId}/tools/${toolId}/test`,
    payload,
  );
  return data;
}
