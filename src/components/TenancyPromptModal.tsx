import { useState } from "react";
import { Check, Layers, Loader2, Store, X } from "lucide-react";
import type { TenancyType } from "@/types/tenant";

/**
 * Asks whether the customer's product is single or multi tenant.
 *
 * Deliberately a modal over the app rather than a wizard gating it: people
 * should be able to look around before answering a question about their own
 * architecture. It appears on first visit, can be dismissed, and comes back
 * at the point the answer actually matters — configuring the voice agent.
 *
 * `required` removes the dismiss affordances for that second case, where we
 * genuinely cannot proceed without an answer.
 */
export default function TenancyPromptModal({
  open,
  onChoose,
  onDismiss,
  required = false,
  title,
  subtitle,
}: {
  open: boolean;
  onChoose: (t: TenancyType) => Promise<void> | void;
  onDismiss?: () => void;
  required?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const [choice, setChoice] = useState<TenancyType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function confirm() {
    if (!choice) return;
    setSaving(true);
    setError("");
    try {
      await onChoose(choice);
    } catch {
      setError("Could not save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const options = [
    {
      key: "single" as TenancyType,
      icon: Store,
      title: "Single Tenant",
      body: "One product or application. The voice agent serves your own customers directly.",
      example: "A single restaurant's website",
    },
    {
      key: "multi" as TenancyType,
      icon: Layers,
      title: "Multi Tenant",
      body: "Your product serves many tenants, each with their own customers and data. The agent works independently for each.",
      example: "A platform hosting many restaurants",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={required ? undefined : onDismiss}
      />

      <div className="relative w-full max-w-xl bg-bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        {!required && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 text-text-dim hover:text-text-muted transition-colors"
          >
            <X size={18} />
          </button>
        )}

        <h2 className="text-lg font-bold tracking-tight pr-8">
          {title ?? "How is your product set up?"}
        </h2>
        <p className="text-text-muted text-sm mt-1.5 mb-6">
          {subtitle ??
            "This decides how the voice agent handles your data and your customers. You can change it later."}
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
            Confirm
          </button>
          {!required && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-text-muted hover:text-text text-sm h-11 px-2 transition-colors"
            >
              Decide later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
