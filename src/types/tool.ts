/**
 * A function tool the voice agent can call.
 *
 * Each tool has two halves. The model only ever reads the first — name,
 * description and parameters — and decides from the description alone whether
 * to call it. The second half is the HTTP recipe: templates whose
 * {placeholders} are filled from the arguments the model produced.
 *
 * `path_template` is always relative and is appended to the tenant's
 * api_base_url, so a tool cannot point at another host. The backend rejects an
 * absolute URL, a "..", and any placeholder that is not a declared parameter.
 */
export interface Tool {
  id: string;
  tenant_id: string;
  /** The function name the model emits. Lowercase snake_case, unique per tenant. */
  name: string;
  /** Human label for the dashboard. Falls back to a prettified `name`. */
  display_name: string | null;
  /** Written for the model: what this does and when to use it. */
  description: string;
  /** JSON Schema for the arguments the model should supply. */
  parameters: JsonSchemaObject;
  http_method: HttpMethod;
  /** Relative to the tenant's API base URL, e.g. "/voice-agent/orders/{order_id}". */
  path_template: string;
  query_template: Record<string, unknown> | null;
  body_template: Record<string, unknown> | null;
  headers_template: Record<string, string> | null;
  /** One sentence for the agent to say on success, with {fields} from the response. */
  success_template: string | null;
  is_enabled: boolean;
  /** Came from a built-in preset — still editable, and resettable. */
  is_builtin: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

export interface JsonSchemaObject {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface JsonSchemaProperty {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  items?: unknown;
  [key: string]: unknown;
}

export const PARAM_TYPES: JsonSchemaProperty["type"][] = [
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object",
];

export interface ToolCreate {
  name: string;
  display_name?: string | null;
  description: string;
  parameters?: JsonSchemaObject | null;
  http_method: HttpMethod;
  path_template: string;
  query_template?: Record<string, unknown> | null;
  body_template?: Record<string, unknown> | null;
  headers_template?: Record<string, string> | null;
  success_template?: string | null;
  is_enabled?: boolean;
  sort_order?: number;
}

/** Partial — only the fields sent are changed. */
export type ToolUpdate = Partial<ToolCreate>;

export interface ToolListResponse {
  tools: Tool[];
  total: number;
  enabled: number;
  /**
   * This tenant has no tools of its own, so the agent is running on the
   * built-in restaurant set. Shown as a prompt to install them properly.
   */
  using_preset_fallback: boolean;
}

/** A built-in tool on offer, and whether this tenant already has it. */
export interface ToolPreset {
  name: string;
  display_name: string | null;
  description: string;
  parameters: JsonSchemaObject;
  http_method: HttpMethod;
  path_template: string;
  installed: boolean;
}

export interface ToolPresetListResponse {
  presets: ToolPreset[];
  total: number;
  installed: number;
}

export interface ToolTestRequest {
  arguments: Record<string, unknown>;
  restaurant_id?: string | null;
}

export interface ToolTestResponse {
  success: boolean;
  /** The resolved method, URL, query and body — a template typo is visible here. */
  request: {
    method?: string;
    url?: string;
    params?: Record<string, string>;
    body?: Record<string, unknown> | null;
    error?: string;
  };
  result: Record<string, unknown> | null;
  /** What the agent would have said, via success_template. */
  spoken_response: string | null;
  error: string | null;
}

/** A readable label for a tool, however it was named. */
export function toolLabel(tool: { display_name?: string | null; name: string }): string {
  if (tool.display_name) return tool.display_name;
  return tool.name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
