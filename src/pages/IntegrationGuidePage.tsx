import { useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Copy, Loader2, Play, Terminal } from "lucide-react";
import { testListingEndpoint } from "@/api/tenants";
import SyncDiagnostic from "@/components/SyncDiagnostic";
import ShareWithDeveloper from "@/components/ShareWithDeveloper";
import type { SyncDiagnostic as Diagnostic } from "@/types/tenant";

/**
 * The customer-facing integration guide.
 *
 * Mirrors docs/integration-guide.md — that file is the source of truth for the
 * contract; this page is how a developer reads it with a live test button.
 *
 * Rendered in two modes:
 *   - signed in  (/integration-guide)  — full page with the Test button
 *   - public     (/guide/:token)       — same content, no account needed, so
 *                                        the spec can be handed to a developer
 */

const SNIPPETS: Record<string, { label: string; lang: string; code: string }> = {
  node: {
    label: "Node / Express",
    lang: "javascript",
    code: `app.get('/voice-agent/restaurants', async (req, res) => {
  // Use the same auth middleware as your other /voice-agent routes
  const rows = await db.query(
    'SELECT slug, display_name FROM restaurants WHERE active = true'
  );

  res.json(
    rows.map((r) => ({
      id: r.slug,          // must match what ?restaurantId= accepts
      name: r.display_name,
    }))
  );
});`,
  },
  python: {
    label: "Python / FastAPI",
    lang: "python",
    code: `@app.get("/voice-agent/restaurants")
def list_restaurants(token: str = Depends(verify_token)):
    rows = db.query(Restaurant).filter(Restaurant.active == True).all()

    return [
        {"id": r.slug, "name": r.display_name}  # id must match ?restaurantId=
        for r in rows
    ]`,
  },
  php: {
    label: "PHP / Laravel",
    lang: "php",
    code: `Route::middleware('auth:api')->get('/voice-agent/restaurants', function () {
    return Restaurant::where('active', true)
        ->get()
        ->map(fn ($r) => [
            'id'   => $r->slug,           // must match ?restaurantId=
            'name' => $r->display_name,
        ]);
});`,
  },
};

const MISTAKES = [
  ["Wrapping the array in an object", 'Return [...], not {"restaurants": [...]}'],
  ["Using restaurant_id instead of id", "Rename the field to exactly id"],
  ["Wrong path", "Must be /voice-agent/restaurants under the same base URL"],
  ["Auth not accepted", "Use the same auth as /voice-agent/menu"],
  ["id doesn't match your menu lookup", "Sync works, but calls find no menu"],
  ["Filtering by the wrong account", "Scope the query to the token we send"],
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-bg border border-border rounded-lg p-4 text-xs font-mono text-text-muted overflow-x-auto">
        {code}
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked — the code is selectable anyway */
          }
        }}
        className="absolute top-2.5 right-2.5 h-7 px-2.5 rounded-md bg-bg-card border border-border text-text-dim hover:text-text-muted text-xs inline-flex items-center gap-1.5 transition-colors"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function IntegrationGuidePage({
  tenantId,
  tenantName,
  apiBaseUrl,
  embedded = false,
}: {
  tenantId?: string;
  tenantName?: string;
  apiBaseUrl?: string | null;
  embedded?: boolean;
} = {}) {
  const params = useParams();
  const [tab, setTab] = useState<keyof typeof SNIPPETS>("node");
  const [testing, setTesting] = useState(false);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);

  const isPublic = !tenantId && Boolean(params.token);
  const fullUrl = apiBaseUrl
    ? `${apiBaseUrl.replace(/\/$/, "")}/voice-agent/restaurants`
    : "https://your-api.com/voice-agent/restaurants";

  async function runTest() {
    if (!tenantId) return;
    setTesting(true);
    try {
      const res = await testListingEndpoint(tenantId);
      setDiagnostic(res.diagnostic);
    } catch {
      setDiagnostic({
        reason: "server_error",
        message: "We couldn't run the test. Please try again.",
        url_called: null,
        status_code: null,
        raw_response: null,
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className={embedded ? "" : "max-w-3xl mx-auto px-4 py-10"}>
      {!embedded && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Integration Guide</h1>
          <p className="text-text-muted text-sm mt-1.5">
            One endpoint connects your restaurants to the voice agent
            {tenantName ? ` for ${tenantName}` : ""}.
          </p>
        </div>
      )}

      {/* Why */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-2">What we need</h2>
        <p className="text-text-muted text-sm leading-relaxed">
          One endpoint that lists your restaurants. That's the whole requirement — you
          already expose <code className="text-accent">/voice-agent/menu</code>; this adds
          a list so we know which IDs are valid.
        </p>
        <p className="text-text-muted text-sm leading-relaxed mt-3">
          We read the list from you rather than asking you to type it in because the ID is
          sent straight back to your API as{" "}
          <code className="text-accent">?restaurantId=</code>. If a typed ID differed from
          yours by one character, the dashboard would look fine while every real call
          failed silently.
        </p>
      </section>

      {/* Spec */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">The endpoint</h2>
        <CodeBlock
          code={`GET ${fullUrl}
Authorization: Bearer <the same token you gave us for /voice-agent/menu>

200 OK
[
  { "id": "spice-garden", "name": "Spice Garden" },
  { "id": "ocean-grill",  "name": "Ocean Grill"  }
]`}
        />
        <div className="mt-4 space-y-2 text-sm text-text-muted">
          <p>
            <code className="text-accent">id</code> — the value we send back as{" "}
            <code className="text-accent">?restaurantId=</code>.{" "}
            <strong className="text-text">Must match your system exactly.</strong>
          </p>
          <p>
            <code className="text-accent">name</code> — shown in the dashboard and spoken
            by the agent.
          </p>
          <p className="text-text-dim">
            Extra fields are ignored, so returning your full object is fine. Deleted a
            restaurant? Just stop returning it — we deactivate it and keep its history.
          </p>
        </div>
      </section>

      {/* Starter code */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">Starter code</h2>
        <div className="flex gap-1.5 mb-3">
          {Object.entries(SNIPPETS).map(([key, s]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as keyof typeof SNIPPETS)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-accent/15 border border-accent/30 text-accent"
                  : "border border-border text-text-muted hover:text-text"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <CodeBlock code={SNIPPETS[tab].code} />
      </section>

      {/* Test */}
      {tenantId && (
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Test it</h2>
          <p className="text-text-muted text-sm mb-4">
            Safe to run as many times as you like — it only reads, and changes nothing.
          </p>
          <button
            type="button"
            onClick={runTest}
            disabled={testing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-on-accent text-sm font-semibold transition-colors"
          >
            {testing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Play size={15} />
            )}
            {testing ? "Testing..." : "Test my endpoint"}
          </button>
          {diagnostic && <SyncDiagnostic diagnostic={diagnostic} className="mt-4" />}
        </section>
      )}

      {isPublic && (
        <section className="mb-8">
          <div className="rounded-xl border border-border bg-bg-card/60 p-4 flex items-start gap-3">
            <Terminal className="text-text-dim shrink-0 mt-0.5" size={16} />
            <p className="text-text-muted text-sm leading-relaxed">
              Once this endpoint is live, let whoever shared this link know — they can run{" "}
              <strong className="text-text">Test my endpoint</strong> and then{" "}
              <strong className="text-text">Sync</strong> from the dashboard.
            </p>
          </div>
        </section>
      )}

      {/* Mistakes */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">Common mistakes</h2>
        <div className="border border-border rounded-xl overflow-hidden">
          {MISTAKES.map(([mistake, fix], i) => (
            <div
              key={mistake}
              className={`grid sm:grid-cols-2 gap-1 sm:gap-4 px-4 py-3 text-sm ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="text-text">{mistake}</span>
              <span className="text-text-muted">{fix}</span>
            </div>
          ))}
        </div>
      </section>

      {tenantId && !embedded && (
        <ShareWithDeveloper
          guideUrl={`${window.location.origin}/guide/${tenantId}`}
          businessName={tenantName}
        />
      )}
    </div>
  );
}
