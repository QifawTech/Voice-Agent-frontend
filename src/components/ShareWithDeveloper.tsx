import { useState } from "react";
import { Check, Copy, Mail, Send } from "lucide-react";

/**
 * "Send this to your developer."
 *
 * The person who signs up is usually not the person who can add an endpoint to
 * the company's API — an owner creates the account, a developer or agency
 * writes the code. Without a way to hand the spec over, the integration stalls
 * on a page only the owner can see.
 *
 * The guide route is public precisely so the recipient does not need an account.
 */
export default function ShareWithDeveloper({
  guideUrl,
  businessName,
  className = "",
}: {
  guideUrl: string;
  businessName?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(guideUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some browsers/contexts; the link is visible
      // below either way, so there is nothing to recover from.
    }
  }

  const subject = encodeURIComponent(
    `Voice agent setup: one API endpoint needed${businessName ? ` for ${businessName}` : ""}`,
  );
  const body = encodeURIComponent(
    `Hi,\n\n` +
      `We're setting up the voice agent and it needs one new endpoint on our API — ` +
      `a list of our restaurants.\n\n` +
      `The full spec, with copy-paste starter code, is here:\n${guideUrl}\n\n` +
      `It's a small change: return [{ "id": ..., "name": ... }] for each restaurant. ` +
      `There's a "Test my endpoint" button on that page to check it once it's live.\n\n` +
      `Thanks!`,
  );

  return (
    <div className={`bg-bg-card/60 border border-border rounded-xl p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
          <Send className="text-accent" size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Not the one building this?</h3>
          <p className="text-text-muted text-sm mt-1 leading-relaxed">
            Send this guide to whoever maintains your API. They won't need an account to
            open it.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Link copied" : "Copy link"}
            </button>
            <a
              href={`mailto:?subject=${subject}&body=${body}`}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border hover:border-accent/40 text-sm font-medium transition-colors"
            >
              <Mail size={14} />
              Email it
            </a>
          </div>

          <p className="text-text-dim text-xs mt-3 font-mono break-all">{guideUrl}</p>
        </div>
      </div>
    </div>
  );
}
