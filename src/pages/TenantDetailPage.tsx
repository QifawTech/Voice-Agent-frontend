import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, RefreshCw, Zap, Code, CheckCircle, XCircle, ArrowLeft, Check } from "lucide-react";
import { getTenant, updateTenant, regenerateKey, testConnection, getEmbedCode } from "@/api/tenants";
import type { Tenant, TenantUpdate } from "@/types/tenant";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import Field from "@/components/shared/Field";
import { Card, CardBody, CardHeader } from "@/components/shared/Card";
import { cn } from "@/lib/utils";
import SubTenantsTab from "@/components/SubTenantsTab";
import ToolsTab from "@/components/ToolsTab";

type Tab = "settings" | "sub-tenants" | "voice" | "tools" | "api" | "widget";

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("settings");
  const [form, setForm] = useState<TenantUpdate>({});
  const [testResult, setTestResult] = useState<{ success: boolean; response_time_ms?: number; error?: string } | null>(null);
  const [embedCode, setEmbedCode] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!id) return;
    getTenant(id)
      .then((t) => {
        setTenant(t);
        setForm({ name: t.name, slug: t.slug, api_base_url: t.api_base_url || "", upi_id: t.upi_id || "" });
      })
      .catch(() => setMessage({ text: "Failed to load tenant", type: "error" }))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateTenant(id, form);
      setTenant(updated);
      setMessage({ text: "Saved successfully", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ text: "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!id) return;
    setTestResult(null);
    try {
      const result = await testConnection(id);
      setTestResult(result);
    } catch {
      setTestResult({ success: false, error: "Connection failed" });
    }
  }

  async function handleRegenerateKey() {
    if (!id || !confirm("This will invalidate the existing API key. Continue?")) return;
    try {
      const updated = await regenerateKey(id);
      setTenant(updated);
      setMessage({ text: "API key regenerated", type: "success" });
    } catch {
      setMessage({ text: "Failed to regenerate key", type: "error" });
    }
  }

  async function handleGetEmbedCode() {
    if (!id) return;
    try {
      const res = await getEmbedCode(id);
      setEmbedCode(res.embed_code);
    } catch {
      setMessage({ text: "Failed to get embed code", type: "error" });
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!tenant) return <div className="text-center py-20 text-text-muted">Tenant not found</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "settings", label: "Settings" },
    // Single-tenant accounts have no sub-tenants at all, so the tab is absent
    // rather than empty — an empty tab would imply "none yet".
    ...(tenant.tenancy_type === "multi"
      ? [{ key: "sub-tenants" as Tab, label: "Tenants" }]
      : []),
    { key: "voice", label: "Voice Config" },
    { key: "tools", label: "Tools" },
    { key: "api", label: "API Connection" },
    { key: "widget", label: "Widget" },
  ];

  return (
    <div className="animate-fade-up space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/tenants")}
        icon={<ArrowLeft size={15} />}
        className="-ml-2"
      >
        Tenants
      </Button>

      <PageHeader
        title={tenant.name}
        subtitle={`/${tenant.slug}`}
        actions={
          <>
            <Badge tone="accent">
              {tenant.tenancy_type === "multi" ? "Multi tenant" : "Single tenant"}
            </Badge>
            <Badge tone={tenant.is_active ? "success" : "danger"}>
              {tenant.is_active ? "Active" : "Inactive"}
            </Badge>
          </>
        }
      />

      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-ctl border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger",
          )}
        >
          {message.type === "success" && <Check size={14} className="shrink-0" />}
          {message.text}
        </div>
      )}

      {tab === "settings" && (
        <Card>
          <CardHeader title="General" subtitle="Name, routing, and the restaurant API this agent orders against" />
          <CardBody className="pt-4">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
                </Field>
                <Field label="Slug">
                  <input value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full" />
                </Field>
                <Field label="API base URL">
                  <input value={form.api_base_url || ""} onChange={(e) => setForm({ ...form, api_base_url: e.target.value })} placeholder="https://api.restaurant.com" className="w-full" />
                </Field>
                <Field label="UPI ID">
                  <input value={form.upi_id || ""} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} placeholder="restaurant@upi" className="w-full" />
                </Field>
              </div>
              <Field label="API auth token" hint="Leave empty to keep the current token.">
                <input type="password" onChange={(e) => setForm({ ...form, api_auth_token: e.target.value })} placeholder="••••••••" className="w-full" />
              </Field>
              <Button type="submit" variant="primary" icon={<Save size={15} />} loading={saving}>
                Save changes
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {tab === "sub-tenants" && (
        <SubTenantsTab tenantId={tenant.id} tenantName={tenant.name} />
      )}

      {tab === "voice" && (
        <Card>
          <CardHeader title="Voice config" subtitle="How the agent greets and speaks to callers" />
          <CardBody className="pt-4">
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Greeting message">
                <textarea
                  value={(form.voice_config as Record<string, string>)?.greeting || (tenant.voice_config as Record<string, string>)?.greeting || ""}
                  onChange={(e) => setForm({ ...form, voice_config: { ...tenant.voice_config, greeting: e.target.value } })}
                  placeholder="Welcome to our restaurant! How can I help you?"
                  rows={3}
                  className="w-full"
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tone">
                  <select
                    value={(form.voice_config as Record<string, string>)?.tone || (tenant.voice_config as Record<string, string>)?.tone || "friendly and professional"}
                    onChange={(e) => setForm({ ...form, voice_config: { ...tenant.voice_config, tone: e.target.value } })}
                    className="w-full"
                  >
                    <option value="friendly and professional">Friendly & Professional</option>
                    <option value="casual and fun">Casual & Fun</option>
                    <option value="formal">Formal</option>
                  </select>
                </Field>
              </div>
              <Button type="submit" variant="primary" icon={<Save size={15} />} loading={saving}>
                Save voice config
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {tab === "tools" && (
        <ToolsTab tenantId={tenant.id} hasApiUrl={!!tenant.api_base_url} />
      )}

      {tab === "api" && (
        <Card>
          <CardHeader title="Restaurant API connection" subtitle="Check that the agent can reach your ordering backend" />
          <CardBody className="space-y-4 pt-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="min-w-0 break-all font-mono text-xs text-text-muted">
                {tenant.api_base_url || "No API URL configured"}
              </p>
              <Button
                variant="secondary"
                icon={<Zap size={15} />}
                onClick={handleTestConnection}
                disabled={!tenant.api_base_url}
                className="shrink-0 self-start"
              >
                Test connection
              </Button>
            </div>
            {testResult && (
              <div className={cn("flex items-center gap-2 text-sm", testResult.success ? "text-success" : "text-danger")}>
                {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {testResult.success
                  ? `Connected in ${testResult.response_time_ms}ms`
                  : `Failed: ${testResult.error}`}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "widget" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Widget API key" subtitle="Authenticates the embedded voice widget" />
            <CardBody className="pt-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <p className="min-w-0 break-all font-mono text-xs text-text-muted">
                  {tenant.widget_api_key || "Not generated"}
                </p>
                <Button
                  variant="danger"
                  icon={<RefreshCw size={15} />}
                  onClick={handleRegenerateKey}
                  className="shrink-0 self-start"
                >
                  Regenerate
                </Button>
              </div>
              <p className="mt-3 text-xs text-text-dim">
                Regenerating invalidates the current key — any live widget using it stops working until you redeploy the new embed code.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Embed code"
              subtitle="Paste this into the restaurant's site"
              action={
                <Button variant="ghost" size="sm" icon={<Code size={14} />} onClick={handleGetEmbedCode}>
                  Generate
                </Button>
              }
            />
            {embedCode && (
              <CardBody className="pt-4">
                <div className="relative">
                  <pre className="overflow-x-auto rounded-ctl border border-border bg-bg-subtle p-4 pr-16 text-xs text-text-muted">
                    {embedCode}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(embedCode)}
                    className="absolute right-2 top-2"
                  >
                    Copy
                  </Button>
                </div>
              </CardBody>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
