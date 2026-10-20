import { Layers } from "lucide-react";

/**
 * Shown after the tenancy prompt is dismissed, until it is actually answered.
 *
 * Dismissing a question should postpone it, not bury it — without this the
 * only way back to the choice would be clearing site data.
 */
export default function TenancyBanner({
  onOpen,
  className = "",
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 ${className}`}
    >
      <Layers className="text-accent shrink-0" size={17} />
      <p className="text-sm text-text-muted flex-1 min-w-[200px]">
        Tell us whether your product is single or multi tenant so the voice agent can be
        configured correctly.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="h-9 px-4 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium transition-colors shrink-0"
      >
        Choose now
      </button>
    </div>
  );
}
