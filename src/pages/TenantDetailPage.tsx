import { useCallback, useEffect, useState, type FormEvent } from "react";
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
import { PROMPT_LANGUAGES } from "@/lib/constants";
import {
  voicesForLanguage,
  DEFAULT_VOICE_BY_LANGUAGE,
  TTS_PROVIDERS,
  ELEVENLABS_MODELS,
  DEFAULT_ELEVENLABS_MODEL,
} from "@/lib/voices";
import {
  listElevenLabsModels,
  listElevenLabsVoices,
  lookupElevenLabsVoice,
  type ElevenLabsModel,
  type ElevenLabsVoice,
} from "@/api/elevenlabs";
import SubTenantsTab from "@/components/SubTenantsTab";
import ToolsTab from "@/components/ToolsTab";

/** Per-language custom prompt stored in voice_config.prompts[<lang>]. */
type LanguagePrompt = { greeting?: string; instructions?: string };

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
  const [promptLang, setPromptLang] = useState<string>(PROMPT_LANGUAGES[0].code);

  // ElevenLabs picker data (loaded lazily when the provider is ElevenLabs).
  const [elModels, setElModels] = useState<ElevenLabsModel[]>([]);
  const [elVoices, setElVoices] = useState<ElevenLabsVoice[]>([]);
  const [elLoaded, setElLoaded] = useState(false);
  const [elError, setElError] = useState<string | null>(null);
  // Voice-ID search box state.
  const [voiceIdQuery, setVoiceIdQuery] = useState("");
  const [voiceLookup, setVoiceLookup] = useState<
    { status: "idle" | "loading" | "ok" | "error"; message?: string }
  >({ status: "idle" });

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

  // Fetch the ElevenLabs model + voice lists from the account (once). Called
  // when the provider is (or becomes) ElevenLabs, so we don't hit the API for
  // tenants that never use it.
  const loadElevenLabsData = useCallback(async () => {
    if (elLoaded) return;
    setElError(null);
    try {
      const [models, voices] = await Promise.all([
        listElevenLabsModels(),
        listElevenLabsVoices(),
      ]);
      setElModels(models);
      setElVoices(voices);
      setElLoaded(true);
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not load ElevenLabs voices/models. Check ELEVENLABS_API_KEY on the backend.";
      setElError(detail);
    }
  }, [elLoaded]);

  // Auto-load if the tenant already has ElevenLabs selected.
  useEffect(() => {
    const provider = (tenant?.voice_config as Record<string, unknown> | undefined)
      ?.tts_provider;
    if (provider === "elevenlabs") loadElevenLabsData();
  }, [tenant, loadElevenLabsData]);

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

  // Config saved on the tenant — the fallback when the form hasn't been touched.
  const savedVoiceConfig = (tenant.voice_config ?? {}) as Record<string, unknown>;

  // Voice config the form is currently editing (falls back to what's saved).
  const voiceConfig = (form.voice_config ?? savedVoiceConfig) as Record<string, unknown>;
  const prompts = (voiceConfig.prompts ?? {}) as Record<string, LanguagePrompt>;
  const currentPrompt = prompts[promptLang] ?? {};

  // The language the agent speaks on calls, and the voice chosen for it.
  const defaultLanguage = (voiceConfig.language as string) || "english";
  const savedVoices = (voiceConfig.voices ?? {}) as Record<string, string>;
  const currentVoice =
    savedVoices[defaultLanguage] || DEFAULT_VOICE_BY_LANGUAGE[defaultLanguage] || "";

  // TTS provider: "auto" (Deepgram/Sarvam by language) or "elevenlabs".
  const ttsProvider = (voiceConfig.tts_provider as string) || "auto";
  const elModel = (voiceConfig.elevenlabs_model as string) || DEFAULT_ELEVENLABS_MODEL;
  const elVoiceId = (voiceConfig.elevenlabs_voice_id as string) || "";

  // Model/voice option lists — prefer the live account lists, fall back to the
  // static model list so the dropdown is never empty.
  const modelOptions =
    elModels.length > 0
      ? elModels.map((m) => ({ id: m.model_id, label: m.name }))
      : ELEVENLABS_MODELS;

  async function handleVoiceIdSearch() {
    const q = voiceIdQuery.trim();
    if (!q) return;
    setVoiceLookup({ status: "loading" });
    try {
      const v = await lookupElevenLabsVoice(q);
      patchVoiceConfig({ elevenlabs_voice_id: v.voice_id });
      // Make sure it shows in the dropdown even if it isn't an account voice.
      setElVoices((prev) =>
        prev.some((p) => p.voice_id === v.voice_id) ? prev : [v, ...prev],
      );
      setVoiceLookup({ status: "ok", message: `Found: ${v.name}` });
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Voice ID not found.";
      setVoiceLookup({ status: "error", message: detail });
    }
  }

  function patchVoiceConfig(patch: Record<string, unknown>) {
    setForm((f) => ({
      ...f,
      voice_config: { ...(f.voice_config ?? savedVoiceConfig), ...patch },
    }));
  }

  function updatePromptField(field: keyof LanguagePrompt, value: string) {
    setForm((f) => {
      const base = (f.voice_config ?? savedVoiceConfig) as Record<string, unknown>;
      const basePrompts = (base.prompts ?? {}) as Record<string, LanguagePrompt>;
      return {
        ...f,
        voice_config: {
          ...base,
          prompts: {
            ...basePrompts,
            [promptLang]: { ...(basePrompts[promptLang] ?? {}), [field]: value },
          },
        },
      };
    });
  }

  // Store the chosen voice under its language, e.g. voices.english = "aura-luna-en".
  function updateVoice(language: string, voiceId: string) {
    setForm((f) => {
      const base = (f.voice_config ?? savedVoiceConfig) as Record<string, unknown>;
      const baseVoices = (base.voices ?? {}) as Record<string, string>;
      return {
        ...f,
        voice_config: { ...base, voices: { ...baseVoices, [language]: voiceId } },
      };
    });
  }

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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="TTS provider"
                  hint="Auto routes by language (Deepgram/Sarvam). ElevenLabs speaks every language with one voice."
                >
                  <select
                    value={ttsProvider}
                    onChange={(e) => {
                      patchVoiceConfig({ tts_provider: e.target.value });
                      if (e.target.value === "elevenlabs") loadElevenLabsData();
                    }}
                    className="w-full"
                  >
                    {TTS_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Default voice language"
                  hint="The language the agent speaks on calls. Tamil uses the Sarvam voice."
                >
                  <select
                    value={(voiceConfig.language as string) || "english"}
                    onChange={(e) => patchVoiceConfig({ language: e.target.value })}
                    className="w-full"
                  >
                    {PROMPT_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {ttsProvider === "auto" && (
                  <Field label="Voice" hint="The voice the agent speaks with on calls, for the default language.">
                    <select
                      value={currentVoice}
                      onChange={(e) => updateVoice(defaultLanguage, e.target.value)}
                      className="w-full"
                    >
                      {voicesForLanguage(defaultLanguage).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                          {v.gender ? ` (${v.gender === "female" ? "F" : "M"})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label={`Pace (${(Number(voiceConfig.pace) || 1).toFixed(2)}×)`} hint="Speaking speed: 1.0 normal, lower is slower, higher is faster.">
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={Number(voiceConfig.pace) || 1}
                    onChange={(e) => patchVoiceConfig({ pace: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </Field>
                <Field label="Tone">
                  <select
                    value={(voiceConfig.tone as string) || "friendly and professional"}
                    onChange={(e) => patchVoiceConfig({ tone: e.target.value })}
                    className="w-full"
                  >
                    <option value="friendly and professional">Friendly & Professional</option>
                    <option value="casual and fun">Casual & Fun</option>
                    <option value="formal">Formal</option>
                  </select>
                </Field>
              </div>

              {ttsProvider === "elevenlabs" && (
                <div className="rounded-lg border border-border/60 p-4 space-y-4">
                  <p className="text-sm font-medium text-text">ElevenLabs settings</p>
                  {elError && (
                    <p className="text-sm text-danger">{elError}</p>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Model" hint="ElevenLabs TTS model used for every language.">
                      <select
                        value={elModel}
                        onChange={(e) => patchVoiceConfig({ elevenlabs_model: e.target.value })}
                        className="w-full"
                      >
                        {modelOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Voice" hint="Pick from your account's voices, or search by ID below.">
                      <select
                        value={elVoiceId}
                        onChange={(e) => patchVoiceConfig({ elevenlabs_voice_id: e.target.value })}
                        className="w-full"
                      >
                        <option value="">— select a voice —</option>
                        {elVoices.map((v) => (
                          <option key={v.voice_id} value={v.voice_id}>
                            {v.name}
                            {v.category ? ` (${v.category})` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field
                    label="Search by Voice ID"
                    hint="Paste any ElevenLabs voice ID and look it up to use it (even if it's not in your account list)."
                  >
                    <div className="flex gap-2">
                      <input
                        value={voiceIdQuery}
                        onChange={(e) => setVoiceIdQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleVoiceIdSearch();
                          }
                        }}
                        placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                        className="w-full"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleVoiceIdSearch}
                        loading={voiceLookup.status === "loading"}
                      >
                        Look up
                      </Button>
                    </div>
                  </Field>
                  {voiceLookup.status === "ok" && (
                    <p className="text-sm text-success">{voiceLookup.message}</p>
                  )}
                  {voiceLookup.status === "error" && (
                    <p className="text-sm text-danger">{voiceLookup.message}</p>
                  )}
                  {elVoiceId && (
                    <p className="text-xs text-text-muted">
                      Selected voice ID: <span className="font-mono">{elVoiceId}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-border/60 p-4 space-y-4">
                <Field
                  label="Edit greeting & prompt for"
                  hint="Pick a language to write its greeting and system prompt. These are stored per language."
                >
                  <select
                    value={promptLang}
                    onChange={(e) => setPromptLang(e.target.value)}
                    className="w-full sm:max-w-xs"
                  >
                    {PROMPT_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`Greeting message (${promptLang})`} hint="The first thing the agent says when a caller connects.">
                  <textarea
                    value={currentPrompt.greeting || ""}
                    onChange={(e) => updatePromptField("greeting", e.target.value)}
                    placeholder="Welcome to our restaurant! How can I help you?"
                    rows={3}
                    className="w-full"
                  />
                </Field>

                <Field
                  label={`System prompt (${promptLang})`}
                  hint="Describe the agent's personality and how it should talk in this language. The built-in ordering, menu-accuracy and voice rules are always kept on top of this, so ordering never breaks. Leave empty to use the default."
                >
                  <textarea
                    value={currentPrompt.instructions || ""}
                    onChange={(e) => updatePromptField("instructions", e.target.value)}
                    placeholder="You are the voice assistant for our restaurant. Be warm and upbeat, use short friendly sentences, and suggest our bestsellers when callers are unsure..."
                    rows={10}
                    className="w-full font-mono text-sm"
                  />
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
