import { useState } from "react";
import { Check, Loader2, MessageSquare, Sparkles } from "lucide-react";
import type { GreetingMode } from "@/types/tenant";

/**
 * Asks how the tenant's opening greeting should be produced, before the agent
 * is allowed to greet callers with anything real.
 *
 * Required (no dismiss): every tenant must pick a mode. Mirrors
 * TenancyPromptModal in look and flow, with one extra step — choosing
 * "Default" reveals an editable welcome line, pre-filled from the tenant name.
 */
export default function GreetingSetupModal({
  open,
  tenantName,
  currentWelcome,
  onSave,
}: {
  open: boolean;
  tenantName: string;
  currentWelcome?: string;
  onSave: (mode: GreetingMode, welcomeText?: string) => Promise<void> | void;
}) {
  const defaultWelcome =
    currentWelcome?.trim() ||
    `Welcome to ${tenantName}! How can I help you today?`;

  const [choice, setChoice] = useState<GreetingMode | null>(null);
  const [welcome, setWelcome] = useState(defaultWelcome);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function confirm() {
    if (!choice) return;
    if (choice === "default" && !welcome.trim()) {
      setError("Please write the welcome message callers will hear.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(choice, choice === "default" ? welcome.trim() : undefined);
    } catch {
      setError("Could not save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const options = [
    {
      key: "api" as GreetingMode,
      icon: Sparkles,
      title: "From my API (dynamic)",
      body: "The agent opens with live details pulled from your own API — e.g. menu size and current best sellers.",
      example: "We have 40+ dishes, our top sellers are…",
    },
    {
      key: "default" as GreetingMode,
      icon: MessageSquare,
      title: "Default welcome (static)",
      body: "A simple fixed welcome using your business name. No API needed.",
      example: `Welcome to ${tenantName}! How can I help you today?`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Required: backdrop does not dismiss. */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-xl bg-bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold tracking-tight">
          Set up your greeting
        </h2>
        <p className="text-text-muted text-sm mt-1.5 mb-6">
          Choose what your voice agent says when a customer first connects. This
          is required before the agent can go live.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = choice === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setChoice(opt.key)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  active
                    ? "border-accent bg-accent/[0.07]"
                    : "border-border bg-bg/40 hover:border-accent/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      active ? "bg-accent/20" : "bg-bg"
                    }`}
                  >
                    <Icon className={active ? "text-accent" : "text-text-dim"} size={17} />
                  </div>
                  {active && <Check className="text-accent" size={16} />}
                </div>
                <h3 className="font-semibold text-sm">{opt.title}</h3>
                <p className="text-text-muted text-sm mt-1 leading-relaxed">{opt.body}</p>
                <p className="text-text-dim text-xs mt-2.5">e.g. {opt.example}</p>
              </button>
            );
          })}
        </div>

        {choice === "default" && (
          <div className="mt-5">
            <label className="block text-sm font-medium mb-1.5">
              Welcome message
            </label>
            <textarea
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-bg/40 px-3 py-2.5 text-sm leading-relaxed focus:border-accent focus:outline-none resize-none"
              placeholder={`Welcome to ${tenantName}! How can I help you today?`}
            />
            <p className="text-text-dim text-xs mt-1.5">
              Spoken as-is at the start of every call.
            </p>
          </div>
        )}

        {choice === "api" && (
          <p className="text-text-muted text-sm mt-5 bg-bg/40 border border-border rounded-lg px-3 py-2.5 leading-relaxed">
            Your agent will call your greeting API when a call connects. Set its
            endpoint under <span className="text-text">Tools → Opening Greeting Data</span>.
            If the call fails, the agent falls back to a simple welcome, so nothing breaks.
          </p>
        )}

        {error && (
          <p className="text-danger text-sm mt-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={confirm}
            disabled={!choice || saving}
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-on-accent font-semibold h-11 px-6 rounded-lg transition-all"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Save greeting
          </button>
        </div>
      </div>
    </div>
  );
}
