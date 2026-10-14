import { AlertTriangle, CheckCircle2, Link2 } from "lucide-react";
import type { SyncDiagnostic as Diagnostic } from "@/types/tenant";

/**
 * Renders the result of a sub-tenant sync or endpoint test.
 *
 * "Sync failed" tells a developer nothing. The job of this component is to show
 * the URL we actually called and what actually came back, side by side with what
 * we expected — which is what lets someone spot a shape mismatch in seconds
 * rather than filing a support ticket.
 *
 * Used in onboarding step 4, the Tenants tab and the integration guide, so the
 * wording stays identical wherever a sync is run.
 */

const EXPECTED_SHAPE = `[
  { "id": "spice-garden", "name": "Spice Garden" },
  { "id": "ocean-grill",  "name": "Ocean Grill"  }
]`;

/** Reason-specific next step. The message itself comes from the backend. */
const FIX_HINTS: Record<string, string> = {
  not_found:
    "Add a GET /voice-agent/restaurants route to your API, under the same base URL as /voice-agent/menu.",
  unauthorized:
    "This endpoint must accept the same Authorization: Bearer token as your other /voice-agent routes.",
  timeout: "Make sure the endpoint responds in under 10 seconds.",
  unreachable: "Check the API base URL is correct and reachable from the public internet.",
  bad_shape:
    'Return a bare array. The field must be "id" — not "restaurant_id", and not wrapped in an object.',
  empty:
    "The endpoint worked but returned nothing. Check the list is not filtered out by the token we send.",
  server_error: "Your API returned an error. Check its logs for this request.",
  not_configured: "Finish connecting your API before syncing.",
};

export default function SyncDiagnostic({
  diagnostic,
  className = "",
}: {
  diagnostic: Diagnostic;
  className?: string;
}) {
  const ok = diagnostic.reason === "ok";
  const hint = FIX_HINTS[diagnostic.reason];
  // Only worth showing their body when the shape is the problem.
  const showComparison =
    !ok && diagnostic.raw_response && ["bad_shape", "empty"].includes(diagnostic.reason);

  return (
    <div
      className={`rounded-xl border p-4 ${
        ok ? "border-accent/30 bg-accent/5" : "border-danger/30 bg-danger/5"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="text-accent shrink-0 mt-0.5" size={18} />
        ) : (
          <AlertTriangle className="text-danger shrink-0 mt-0.5" size={18} />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${ok ? "text-accent" : "text-danger"}`}>
            {diagnostic.message}
          </p>

          {hint && !ok && (
            <p className="text-text-muted text-sm mt-2 leading-relaxed">{hint}</p>
          )}

          {diagnostic.url_called && (
            <p className="text-text-dim text-xs mt-3 flex items-center gap-1.5 break-all">
              <Link2 size={12} className="shrink-0" />
              <span className="font-mono">
                GET {diagnostic.url_called}
                {diagnostic.status_code ? ` → ${diagnostic.status_code}` : ""}
              </span>
            </p>
          )}

          {showComparison && (
            <div className="grid gap-3 mt-4 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-text-dim text-xs font-medium mb-1.5">
                  What your API returned
                </p>
                <pre className="bg-bg border border-danger/25 rounded-lg p-2.5 text-xs font-mono text-text-muted overflow-x-auto whitespace-pre-wrap break-all">
                  {diagnostic.raw_response}
                </pre>
              </div>
              <div className="min-w-0">
                <p className="text-text-dim text-xs font-medium mb-1.5">What we expected</p>
                <pre className="bg-bg border border-border rounded-lg p-2.5 text-xs font-mono text-text-muted overflow-x-auto">
                  {EXPECTED_SHAPE}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
