import { useCallback, useEffect, useState } from "react";
import { Check, Code, Copy, Loader2, Lock, RefreshCw, Save } from "lucide-react";
import {
  getSubTenantEmbedCode,
  listSubTenants,
  syncSubTenants,
  updateSubTenantOverrides,
} from "@/api/tenants";
import SyncDiagnostic from "@/components/SyncDiagnostic";
import ShareWithDeveloper from "@/components/ShareWithDeveloper";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import type { SubTenant, SyncDiagnostic as Diagnostic } from "@/types/tenant";

/**
 * The Tenants tab for a multi-tenant account.
 *
 * Name and slug render as read-only with a lock icon, because they come from
 * the customer's API and the next sync would overwrite any edit. Only the
 * display overrides (greeting, UPI) are editable, and leaving them blank means
 * "inherit from the parent tenant".
 */

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SubTenantRow({
  tenantId,
  sub,
  onSaved,
}: {
  tenantId: string;
  sub: SubTenant;
  onSaved: (s: SubTenant) => void;
}) {
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(
    (sub.voice_config?.greeting as string) ?? "",
  );
  const [upi, setUpi] = useState(sub.upi_id ?? "");
  const [saving, setSaving] = useState(false);
  const [embed, setEmbed] = useState("");
  const [copied, setCopied] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateSubTenantOverrides(tenantId, sub.id, {
        // Empty string means "inherit", which the backend stores as null.
        upi_id: upi.trim() || null,
        voice_config: greeting.trim() ? { greeting: greeting.trim() } : null,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  async function loadEmbed() {
    if (embed) return;
    const res = await getSubTenantEmbedCode(tenantId, sub.id);
    setEmbed(res.embed_code);
  }

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-bg-card/40 transition-colors text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{sub.name}</span>
            {!sub.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger shrink-0">
                Inactive
              </span>
            )}
          </div>
          <span className="text-text-dim text-xs font-mono">{sub.slug}</span>
        </div>
        <span className="text-text-dim text-xs shrink-0 ml-3">
          {open ? "Hide" : "Edit"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-5 space-y-4 bg-bg-card/30">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-text-dim mb-1.5">
                <Lock size={11} /> Name — from your API
              </label>
              <input
                value={sub.name}
                readOnly
                className="w-full h-10 bg-bg/60 text-text-dim cursor-not-allowed"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-text-dim mb-1.5">
                <Lock size={11} /> ID — sent as ?restaurantId=
              </label>
              <input
                value={sub.slug}
                readOnly
                className="w-full h-10 bg-bg/60 text-text-dim font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Greeting <span className="text-text-dim">(blank = inherit)</span>
            </label>
            <input
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Inheriting the platform greeting"
              className="w-full h-10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              UPI ID <span className="text-text-dim">(blank = inherit)</span>
            </label>
            <input
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="Inheriting the platform UPI"
              className="w-full h-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button
              type="button"
              onClick={loadEmbed}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border hover:border-accent/40 text-sm font-medium transition-colors"
            >
              <Code size={14} /> Embed code
            </button>
          </div>

          {embed && (
            <div className="relative">
              <pre className="bg-bg border border-border rounded-lg p-3 text-xs font-mono text-text-muted overflow-x-auto">
                {embed}
              </pre>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(embed);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    /* clipboard blocked; the snippet is selectable */
                  }
                }}
                className="absolute top-2 right-2 h-7 px-2.5 rounded-md bg-bg-card border border-border text-text-dim hover:text-text-muted text-xs inline-flex items-center gap-1.5"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubTenantsTab({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const [subs, setSubs] = useState<SubTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);

  const load = useCallback(() => {
    listSubTenants(tenantId)
      .then((r) => setSubs(r.sub_tenants))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(load, [load]);

  async function runSync() {
    setSyncing(true);
    setDiagnostic(null);
    try {
      const res = await syncSubTenants(tenantId);
      if (res.success) {
        setSubs(res.sub_tenants);
        setDiagnostic({
          reason: "ok",
          message: `Synced — ${res.created} added, ${res.updated} updated, ${res.deactivated} deactivated.`,
          url_called: null,
          status_code: null,
          raw_response: null,
        });
      } else {
        setDiagnostic(res.diagnostic);
      }
    } catch {
      setDiagnostic({
        reason: "server_error",
        message: "We couldn't reach your API. Please try again.",
        url_called: null,
        status_code: null,
        raw_response: null,
      });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const lastSynced = subs.reduce<string | null>(
    (acc, s) => (!acc || (s.last_synced_at ?? "") > acc ? s.last_synced_at : acc),
    null,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold">Your tenants</h3>
          <p className="text-text-muted text-sm mt-1">
            Read from your API — last synced {timeAgo(lastSynced)}.
          </p>
        </div>
        <button
          type="button"
          onClick={runSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent text-sm font-semibold transition-colors shrink-0"
        >
          {syncing ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
          {syncing ? "Syncing..." : "Re-sync"}
        </button>
      </div>

      {diagnostic && <SyncDiagnostic diagnostic={diagnostic} />}

      {subs.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          {subs.map((s) => (
            <SubTenantRow
              key={s.id}
              tenantId={tenantId}
              sub={s}
              onSaved={(u) => setSubs(subs.map((x) => (x.id === u.id ? u : x)))}
            />
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-xl p-8 text-center">
          <p className="text-sm font-medium">No tenants yet</p>
          <p className="text-text-muted text-sm mt-1.5">
            Click Re-sync to read them from your API.
          </p>
        </div>
      )}

      {(subs.length === 0 || diagnostic?.reason === "not_found") && (
        <ShareWithDeveloper
          guideUrl={`${window.location.origin}/guide/${tenantId}`}
          businessName={tenantName}
        />
      )}
    </div>
  );
}
