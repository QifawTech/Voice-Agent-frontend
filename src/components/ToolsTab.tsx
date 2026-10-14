import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  createTool,
  deleteTool,
  installToolPresets,
  listToolPresets,
  listTools,
  resetTool,
  testTool,
  updateTool,
} from "@/api/tools";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  HTTP_METHODS,
  PARAM_TYPES,
  toolLabel,
  type HttpMethod,
  type JsonSchemaObject,
  type JsonSchemaProperty,
  type Tool,
  type ToolPreset,
  type ToolTestResponse,
} from "@/types/tool";

/**
 * The Tools tab — what this tenant's voice agent can actually do.
 *
 * A tool is a function the model may call, plus the HTTP request that call
 * turns into. Both halves are edited here, which is the point: the seven
 * restaurant tools used to be hardcoded in Python, so adding a table booking
 * meant a deploy.
 *
 * Three things the layout is deliberately trying to teach:
 *
 *   1. The description is written FOR THE MODEL. It is the only thing the model
 *      reads when deciding whether to call a tool, so the field is labelled
 *      that way rather than as a note to self.
 *
 *   2. The path is relative to the tenant's API base URL, shown as a prefix on
 *      the input so nobody pastes a full URL into it.
 *
 *   3. A tool can be tested against the real API before a customer meets it,
 *      and the resolved request comes back so a {placeholder} typo is visible.
 */

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-info/10 text-info",
  POST: "bg-success/10 text-success",
  PUT: "bg-warning/10 text-warning",
  PATCH: "bg-warning/10 text-warning",
  DELETE: "bg-danger/10 text-danger",
};

const EMPTY_SCHEMA: JsonSchemaObject = { type: "object", properties: {}, required: [] };

/** The shape a brand-new tool starts in. */
function blankTool(): Omit<Tool, "id" | "tenant_id" | "created_at" | "updated_at"> {
  return {
    name: "",
    display_name: "",
    description: "",
    parameters: { ...EMPTY_SCHEMA, properties: {} },
    http_method: "GET",
    path_template: "/",
    query_template: null,
    body_template: null,
    headers_template: null,
    success_template: null,
    is_enabled: true,
    is_builtin: false,
    sort_order: 100,
  };
}

/** Pull a readable message out of whatever the API rejected us with. */
function errorText(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined;
    if (first?.msg) {
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null;
      return field ? `${field}: ${first.msg}` : first.msg;
    }
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// A JSON object field, with parse errors shown as you type
// ---------------------------------------------------------------------------

function JsonField({
  label,
  hint,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  hint?: string;
  value: Record<string, unknown> | null;
  onChange: (v: Record<string, unknown> | null) => void;
  rows?: number;
}) {
  const [text, setText] = useState(() =>
    value ? JSON.stringify(value, null, 2) : "",
  );
  const [error, setError] = useState<string | null>(null);

  function handle(next: string) {
    setText(next);
    if (!next.trim()) {
      setError(null);
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(next);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setError("Must be a JSON object, like { \"key\": \"{value}\" }");
        return;
      }
      setError(null);
      onChange(parsed as Record<string, unknown>);
    } catch {
      setError("Not valid JSON yet");
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
      <textarea
        value={text}
        onChange={(e) => handle(e.target.value)}
        rows={rows}
        spellCheck={false}
        placeholder="Leave empty for none"
        className={`w-full font-mono text-xs ${error ? "border-danger" : ""}`}
      />
      {error ? (
        <p className="text-xs text-danger mt-1">{error}</p>
      ) : (
        hint && <p className="text-xs text-text-dim mt-1">{hint}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parameters editor
// ---------------------------------------------------------------------------

/**
 * Edits the JSON Schema the model fills in.
 *
 * Rows cover the common case. The JSON view is not an escape hatch for power
 * users so much as a necessity: create_order's `items` is an array of objects,
 * which no row of inputs can express, and editing that tool must not silently
 * flatten it. Rows therefore preserve every key they do not show.
 */
function ParametersEditor({
  schema,
  onChange,
}: {
  schema: JsonSchemaObject;
  onChange: (s: JsonSchemaObject) => void;
}) {
  const [asJson, setAsJson] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(schema, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const props = schema.properties ?? {};
  const required = schema.required ?? [];
  const names = Object.keys(props);

  function setProps(nextProps: Record<string, JsonSchemaProperty>, nextRequired = required) {
    onChange({
      ...schema,
      type: "object",
      properties: nextProps,
      required: nextRequired.filter((r) => r in nextProps),
    });
  }

  function renameParam(from: string, to: string) {
    // Rebuild in order so a rename does not jump the row to the end.
    const next: Record<string, JsonSchemaProperty> = {};
    for (const key of names) next[key === from ? to : key] = props[key];
    setProps(next, required.map((r) => (r === from ? to : r)));
  }

  function patchParam(name: string, patch: Partial<JsonSchemaProperty>) {
    // Spread the existing property first: nested `items`, `enum`, `minimum`
    // and anything else we do not render must survive an edit.
    setProps({ ...props, [name]: { ...props[name], ...patch } });
  }

  function addParam() {
    let base = "new_param";
    let n = 1;
    while (base in props) base = `new_param_${++n}`;
    setProps({ ...props, [base]: { type: "string", description: "" } });
  }

  function removeParam(name: string) {
    const next = { ...props };
    delete next[name];
    setProps(next, required.filter((r) => r !== name));
  }

  function toggleRequired(name: string) {
    setProps(
      props,
      required.includes(name) ? required.filter((r) => r !== name) : [...required, name],
    );
  }

  function applyJson(next: string) {
    setJsonText(next);
    try {
      const parsed = JSON.parse(next);
      if (parsed?.type !== "object" || typeof parsed.properties !== "object") {
        setJsonError('Must be a JSON Schema object with "type": "object" and "properties".');
        return;
      }
      setJsonError(null);
      onChange(parsed as JsonSchemaObject);
    } catch {
      setJsonError("Not valid JSON yet");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-text-muted">
          Parameters — what the model fills in
        </label>
        <button
          type="button"
          onClick={() => {
            setJsonText(JSON.stringify(schema, null, 2));
            setJsonError(null);
            setAsJson(!asJson);
          }}
          className="text-xs text-accent hover:text-accent-hover font-medium"
        >
          {asJson ? "Edit as fields" : "Edit as JSON"}
        </button>
      </div>

      {asJson ? (
        <>
          <textarea
            value={jsonText}
            onChange={(e) => applyJson(e.target.value)}
            rows={12}
            spellCheck={false}
            className={`w-full font-mono text-xs ${jsonError ? "border-danger" : ""}`}
          />
          {jsonError && <p className="text-xs text-danger mt-1">{jsonError}</p>}
        </>
      ) : (
        <div className="space-y-2">
          {names.length === 0 && (
            <p className="text-xs text-text-dim py-2">
              No parameters — the model calls this tool with no arguments.
            </p>
          )}

          {names.map((name) => {
            const prop = props[name];
            // Keys we do not render as inputs. If a property carries any, say
            // so rather than letting someone think this is the whole shape.
            const extraKeys = Object.keys(prop).filter(
              (k) => !["type", "description"].includes(k),
            );
            return (
              <div key={name} className="bg-bg/40 border border-border rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => renameParam(name, e.target.value)}
                    placeholder="param_name"
                    spellCheck={false}
                    className="flex-1 min-w-0 h-9 font-mono text-xs"
                  />
                  <select
                    value={prop.type}
                    onChange={(e) =>
                      patchParam(name, {
                        type: e.target.value as JsonSchemaProperty["type"],
                      })
                    }
                    className="h-9 text-xs w-[7.5rem] shrink-0"
                  >
                    {PARAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => toggleRequired(name)}
                    title={
                      required.includes(name)
                        ? "Required — the model must supply it"
                        : "Optional"
                    }
                    className={`h-9 px-2.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                      required.includes(name)
                        ? "bg-accent/10 text-accent"
                        : "bg-bg text-text-dim hover:text-text"
                    }`}
                  >
                    Required
                  </button>
                  <button
                    type="button"
                    onClick={() => removeParam(name)}
                    title="Remove parameter"
                    className="h-9 w-9 grid place-items-center rounded-lg text-text-dim hover:text-danger shrink-0 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <input
                  value={(prop.description as string) ?? ""}
                  onChange={(e) => patchParam(name, { description: e.target.value })}
                  placeholder="Describe this for the model, e.g. 'The order ID to look up.'"
                  className="w-full h-9 text-xs"
                />
                {extraKeys.length > 0 && (
                  <p className="text-xs text-text-dim">
                    Also has {extraKeys.join(", ")} — switch to JSON to change that.
                  </p>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addParam}
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover font-medium"
          >
            <Plus size={13} /> Add parameter
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test panel
// ---------------------------------------------------------------------------

/**
 * Runs the saved tool against the tenant's real API.
 *
 * The warning is not boilerplate: testing create_order places an order, and
 * testing cancel_order cancels one. Better said plainly here than discovered
 * in the order list.
 */
function TestPanel({
  tenantId,
  tool,
}: {
  tenantId: string;
  tool: Tool;
}) {
  const [argsText, setArgsText] = useState(() => suggestArgs(tool));
  const [restaurantId, setRestaurantId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ToolTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    let args: Record<string, unknown>;
    try {
      args = argsText.trim() ? JSON.parse(argsText) : {};
    } catch {
      setError("Arguments must be valid JSON.");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await testTool(tenantId, tool.id, {
          arguments: args,
          restaurant_id: restaurantId.trim() || null,
        }),
      );
    } catch (e) {
      setError(errorText(e, "The test could not be run."));
    } finally {
      setRunning(false);
    }
  }

  const isWrite = tool.http_method !== "GET";

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div>
        <p className="text-xs font-semibold">Test this tool</p>
        <p className="text-xs text-text-muted mt-1">
          Calls your real API with the arguments below, exactly as the agent would.
        </p>
      </div>

      {isWrite && (
        <div className="flex items-start gap-2 text-xs bg-warning/10 border border-warning/30 text-warning rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            This is a {tool.http_method} — running it will really change data in your
            system.
          </span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Arguments the model would send
        </label>
        <textarea
          value={argsText}
          onChange={(e) => setArgsText(e.target.value)}
          rows={4}
          spellCheck={false}
          className="w-full font-mono text-xs"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            Test as tenant (optional)
          </label>
          <input
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            placeholder="Sub-tenant slug, sent as restaurantId"
            className="w-full h-10 text-xs font-mono"
          />
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-info/10 hover:bg-info/20 disabled:opacity-50 text-info text-sm font-semibold transition-colors shrink-0"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {running ? "Running..." : "Run test"}
        </button>
      </div>

      {error && (
        <div className="text-xs rounded-lg px-3 py-2 bg-danger/10 border border-danger/30 text-danger">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div
            className={`flex items-center gap-2 text-xs font-medium ${
              result.success ? "text-success" : "text-danger"
            }`}
          >
            {result.success ? <Check size={14} /> : <X size={14} />}
            {result.success ? "Call succeeded" : result.error || "Call failed"}
          </div>

          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5">
              The request your templates produced
            </p>
            <pre className="bg-bg text-xs text-text-muted p-3 rounded-lg overflow-x-auto">
              {result.request.error
                ? result.request.error
                : `${result.request.method} ${result.request.url}` +
                  (result.request.params && Object.keys(result.request.params).length
                    ? `\n\nQuery: ${JSON.stringify(result.request.params, null, 2)}`
                    : "") +
                  (result.request.body
                    ? `\n\nBody: ${JSON.stringify(result.request.body, null, 2)}`
                    : "")}
            </pre>
          </div>

          {result.spoken_response && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-1.5">
                What the agent would say
              </p>
              <p className="text-sm bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
                “{result.spoken_response}”
              </p>
            </div>
          )}

          {result.result && (
            <details>
              <summary className="text-xs text-text-dim cursor-pointer hover:text-text-muted">
                Raw response from your API
              </summary>
              <pre className="bg-bg text-xs text-text-muted p-3 rounded-lg overflow-x-auto mt-2 max-h-72">
                {JSON.stringify(result.result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/** A plausible starting point for the test arguments, from the tool's schema. */
function suggestArgs(tool: Tool): string {
  const props = tool.parameters?.properties ?? {};
  const required = tool.parameters?.required ?? [];
  const sample: Record<string, unknown> = {};
  for (const name of Object.keys(props)) {
    if (!required.includes(name)) continue;
    switch (props[name].type) {
      case "integer":
      case "number":
        sample[name] = 1;
        break;
      case "boolean":
        sample[name] = true;
        break;
      case "array":
        sample[name] = [];
        break;
      case "object":
        sample[name] = {};
        break;
      default:
        sample[name] = "";
    }
  }
  return JSON.stringify(sample, null, 2);
}

// ---------------------------------------------------------------------------
// One tool row (collapsed) + its editor (expanded)
// ---------------------------------------------------------------------------

function ToolRow({
  tenantId,
  tool,
  isNew,
  onSaved,
  onDeleted,
  onCancelNew,
}: {
  tenantId: string;
  tool: Tool;
  isNew?: boolean;
  onSaved: (t: Tool) => void;
  onDeleted: (id: string) => void;
  onCancelNew?: () => void;
}) {
  const [open, setOpen] = useState(!!isNew);
  const [form, setForm] = useState(tool);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the row is replaced by a fresh copy from the server.
  useEffect(() => setForm(tool), [tool]);

  function set<K extends keyof Tool>(key: K, value: Tool[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        display_name: form.display_name?.trim() || null,
        description: form.description.trim(),
        parameters: form.parameters,
        http_method: form.http_method,
        path_template: form.path_template.trim(),
        query_template: form.query_template,
        body_template: form.body_template,
        headers_template: form.headers_template,
        success_template: form.success_template?.trim() || null,
        is_enabled: form.is_enabled,
        sort_order: form.sort_order,
      };
      const saved = isNew
        ? await createTool(tenantId, payload)
        : await updateTool(tenantId, tool.id, payload);
      onSaved(saved);
      if (!isNew) setOpen(false);
    } catch (e) {
      setError(errorText(e, "The tool could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  /** Toggling enabled is a one-field patch, so it works from the collapsed row. */
  async function toggleEnabled() {
    if (isNew) {
      set("is_enabled", !form.is_enabled);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSaved(await updateTool(tenantId, tool.id, { is_enabled: !form.is_enabled }));
    } catch (e) {
      setError(errorText(e, "Could not change whether this tool is enabled."));
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    if (!confirm(`Restore "${toolLabel(form)}" to its built-in definition? Your edits to it will be lost.`))
      return;
    setBusy(true);
    try {
      onSaved(await resetTool(tenantId, tool.id));
    } catch (e) {
      setError(errorText(e, "Could not reset this tool."));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (
      !confirm(
        `Delete "${toolLabel(form)}"? The agent will no longer be able to do this. ` +
          `To keep the configuration, switch it off instead.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteTool(tenantId, tool.id);
      onDeleted(tool.id);
    } catch (e) {
      setError(errorText(e, "Could not delete this tool."));
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border first:border-t-0">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={busy}
          title={form.is_enabled ? "Enabled — switch off" : "Disabled — switch on"}
          aria-label={form.is_enabled ? "Disable this tool" : "Enable this tool"}
          className={`relative h-5 w-9 rounded-full shrink-0 transition-colors disabled:opacity-50 ${
            form.is_enabled ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
              form.is_enabled ? "left-[1.125rem]" : "left-0.5"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium truncate ${
                  form.is_enabled ? "" : "text-text-dim"
                }`}
              >
                {toolLabel(form)}
              </span>
              {form.is_builtin && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-bg text-text-dim shrink-0">
                  Built-in
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded ${
                  METHOD_COLORS[form.http_method]
                }`}
              >
                {form.http_method}
              </span>
              <span className="text-text-dim text-xs font-mono truncate">
                {form.path_template}
              </span>
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-text-dim shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-5 space-y-4 bg-bg-card/30">
          {error && (
            <div className="text-xs rounded-lg px-3 py-2 bg-danger/10 border border-danger/30 text-danger">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Label
              </label>
              <input
                value={form.display_name ?? ""}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="Book a Table"
                className="w-full h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Function name
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="book_table"
                spellCheck={false}
                className="w-full h-10 font-mono text-sm"
              />
              <p className="text-xs text-text-dim mt-1">
                Lowercase with underscores. This is the name the model calls.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Description — written for the model
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Reserve a table. Use when the customer asks to book, and confirm the party size and time before calling."
              className="w-full"
            />
            <p className="text-xs text-text-dim mt-1">
              This is all the model reads when deciding whether to use this tool, so
              say when to use it, not just what it does.
            </p>
          </div>

          <ParametersEditor
            schema={form.parameters ?? EMPTY_SCHEMA}
            onChange={(s) => set("parameters", s)}
          />

          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-xs font-semibold">The request this makes</p>

            <div className="flex gap-3">
              <div className="shrink-0">
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Method
                </label>
                <select
                  value={form.http_method}
                  onChange={(e) => set("http_method", e.target.value as HttpMethod)}
                  className="h-10 w-28"
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Path
                </label>
                <input
                  value={form.path_template}
                  onChange={(e) => set("path_template", e.target.value)}
                  placeholder="/voice-agent/reservations/{reservation_id}"
                  spellCheck={false}
                  className="w-full h-10 font-mono text-sm"
                />
                <p className="text-xs text-text-dim mt-1">
                  Added to your API base URL — relative only. Use{" "}
                  <code className="font-mono">{"{param}"}</code> for a parameter, and{" "}
                  <code className="font-mono">{"[/{param}]"}</code> for a segment that
                  is skipped when the parameter is absent.
                </p>
              </div>
            </div>

            <JsonField
              label="Query parameters"
              hint='e.g. { "category": "{category}", "restaurantId": "{restaurant_id}" } — a key whose parameter is missing is left out.'
              value={form.query_template}
              onChange={(v) => set("query_template", v)}
            />

            {form.http_method !== "GET" && (
              <JsonField
                label="Request body"
                hint='e.g. { "items": "{items}" } — "{items}" alone keeps the value&apos;s real type, so an array stays an array.'
                value={form.body_template}
                onChange={(v) => set("body_template", v)}
                rows={6}
              />
            )}

            <JsonField
              label="Extra headers"
              hint="Authorization is sent from your API Connection settings and cannot be set here."
              value={form.headers_template as Record<string, unknown> | null}
              onChange={(v) => set("headers_template", v as Record<string, string> | null)}
              rows={3}
            />

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                What the agent says on success
              </label>
              <input
                value={form.success_template ?? ""}
                onChange={(e) => set("success_template", e.target.value)}
                placeholder="Your table is booked. The reference is {reservation_id}."
                className="w-full h-10"
              />
              <p className="text-xs text-text-dim mt-1">
                Fields come from your API&apos;s response. Use{" "}
                <code className="font-mono">{"{items[*].name}"}</code> to read out a
                list. Leave empty for a generic summary.
              </p>
            </div>
          </div>

          {!isNew && <TestPanel tenantId={tenantId} tool={tool} />}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent text-sm font-semibold transition-colors"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Saving..." : isNew ? "Create tool" : "Save changes"}
            </button>

            {isNew ? (
              <button
                type="button"
                onClick={onCancelNew}
                className="h-10 px-4 rounded-lg text-text-muted hover:text-text text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            ) : (
              <>
                {form.is_builtin && (
                  <button
                    type="button"
                    onClick={doReset}
                    disabled={busy}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-text-muted hover:text-text disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    <RotateCcw size={15} /> Reset to default
                  </button>
                )}
                <button
                  type="button"
                  onClick={doDelete}
                  disabled={busy}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-danger hover:bg-danger/10 disabled:opacity-50 text-sm font-medium transition-colors ml-auto"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset picker
// ---------------------------------------------------------------------------

/**
 * The built-in restaurant tools on offer.
 *
 * Shown open when the tenant has none of them, because an empty Tools tab with
 * an "Add tool" button asks someone to hand-write check_menu from scratch —
 * when the thing they almost certainly want is already written.
 */
function PresetPicker({
  presets,
  onInstall,
  installing,
  defaultOpen,
}: {
  presets: ToolPreset[];
  onInstall: (names: string[]) => void;
  installing: boolean;
  defaultOpen: boolean;
}) {
  const available = presets.filter((p) => !p.installed);
  const [open, setOpen] = useState(defaultOpen);
  const [picked, setPicked] = useState<string[]>(() => available.map((p) => p.name));

  // Keep the selection in step as presets get installed.
  useEffect(() => {
    setPicked(presets.filter((p) => !p.installed).map((p) => p.name));
  }, [presets]);

  if (available.length === 0) return null;

  return (
    <div className="border border-accent/30 bg-accent/5 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex items-start gap-3 min-w-0">
          <Wrench size={16} className="text-accent mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {available.length} standard restaurant{" "}
              {available.length === 1 ? "tool" : "tools"} ready to add
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Menu lookups, prices, ordering, order status, cancellation and payment
              details — already written and pointing at your API.
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-text-dim shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {available.map((p) => (
            <label
              key={p.name}
              className="flex items-start gap-3 bg-bg-card border border-border rounded-lg px-3 py-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={picked.includes(p.name)}
                onChange={(e) =>
                  setPicked(
                    e.target.checked
                      ? [...picked, p.name]
                      : picked.filter((n) => n !== p.name),
                  )
                }
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{toolLabel(p)}</span>
                  <span
                    className={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded ${
                      METHOD_COLORS[p.http_method]
                    }`}
                  >
                    {p.http_method}
                  </span>
                  <span className="text-text-dim text-xs font-mono truncate">
                    {p.path_template}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1">{p.description}</p>
              </div>
            </label>
          ))}

          <button
            type="button"
            onClick={() => onInstall(picked)}
            disabled={installing || picked.length === 0}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent text-sm font-semibold transition-colors"
          >
            {installing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            {installing
              ? "Adding..."
              : `Add ${picked.length} ${picked.length === 1 ? "tool" : "tools"}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The tab
// ---------------------------------------------------------------------------

export default function ToolsTab({
  tenantId,
  hasApiUrl,
}: {
  tenantId: string;
  hasApiUrl: boolean;
}) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [presets, setPresets] = useState<ToolPreset[]>([]);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, presetList] = await Promise.all([
        listTools(tenantId),
        listToolPresets(tenantId),
      ]);
      setTools(list.tools);
      setFallback(list.using_preset_fallback);
      setPresets(presetList.presets);
    } catch (e) {
      setError(errorText(e, "Could not load this tenant's tools."));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function install(names: string[]) {
    setInstalling(true);
    setError(null);
    try {
      const list = await installToolPresets(tenantId, names);
      setTools(list.tools);
      setFallback(list.using_preset_fallback);
      setPresets((await listToolPresets(tenantId)).presets);
    } catch (e) {
      setError(errorText(e, "The tools could not be added."));
    } finally {
      setInstalling(false);
    }
  }

  function afterSave(saved: Tool) {
    setTools((prev) => {
      const next = prev.some((t) => t.id === saved.id)
        ? prev.map((t) => (t.id === saved.id ? saved : t))
        : [...prev, saved];
      return next.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    });
    setFallback(false);
    setAddingNew(false);
    void listToolPresets(tenantId).then((p) => setPresets(p.presets));
  }

  if (loading) return <LoadingSpinner />;

  const enabled = tools.filter((t) => t.is_enabled).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold">What your agent can do</h3>
          <p className="text-text-muted text-sm mt-1">
            {tools.length === 0
              ? "No tools configured yet."
              : `${enabled} of ${tools.length} ${
                  tools.length === 1 ? "tool" : "tools"
                } enabled. The agent picks up a change on its next call.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          disabled={addingNew}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent text-sm font-semibold transition-colors shrink-0"
        >
          <Plus size={15} /> Add tool
        </button>
      </div>

      {error && (
        <div className="text-sm rounded-lg px-4 py-3 bg-danger/10 border border-danger/30 text-danger">
          {error}
        </div>
      )}

      {!hasApiUrl && (
        <div className="flex items-start gap-2 text-sm bg-warning/10 border border-warning/30 text-warning rounded-lg px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            No API base URL is set for this tenant, so every tool call will fail. Set
            it under API Connection first.
          </span>
        </div>
      )}

      {fallback && (
        <div className="flex items-start gap-2 text-sm bg-info/10 border border-info/30 text-info rounded-lg px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            This tenant has no tools of its own, so the agent is running on the
            standard restaurant set. Add them below to see and edit what it can do.
          </span>
        </div>
      )}

      <PresetPicker
        presets={presets}
        onInstall={install}
        installing={installing}
        defaultOpen={tools.length === 0}
      />

      {addingNew && (
        <div className="border border-accent/40 rounded-xl overflow-hidden">
          <ToolRow
            tenantId={tenantId}
            tool={{
              ...blankTool(),
              id: "new",
              tenant_id: tenantId,
              created_at: "",
              updated_at: "",
            }}
            isNew
            onSaved={afterSave}
            onDeleted={() => setAddingNew(false)}
            onCancelNew={() => setAddingNew(false)}
          />
        </div>
      )}

      {tools.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          {tools.map((t) => (
            <ToolRow
              key={t.id}
              tenantId={tenantId}
              tool={t}
              onSaved={afterSave}
              onDeleted={(id) => setTools((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      ) : (
        !addingNew && (
          <div className="border border-border rounded-xl p-8 text-center">
            <p className="text-sm font-medium">No tools yet</p>
            <p className="text-text-muted text-sm mt-1.5">
              Add the standard restaurant tools above, or build your own.
            </p>
          </div>
        )
      )}
    </div>
  );
}
