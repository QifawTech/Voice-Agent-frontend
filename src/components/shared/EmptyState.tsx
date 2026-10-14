import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  /** `danger` is for failures — a violet chip reads as "fine" on an error. */
  tone?: "default" | "danger";
  className?: string;
}

/**
 * A first-run screen is the most-seen screen in a young product — it should
 * explain and offer a next step, not just report absence.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "default",
  className,
}: Props) {
  const isDanger = tone === "danger";

  return (
    <div
      className={cn(
        "sheen relative overflow-hidden rounded-card border border-border bg-bg-card px-6 py-16 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-0 h-56 w-[420px] -translate-x-1/2 rounded-full blur-[90px]",
          isDanger ? "bg-danger/10" : "bg-accent/10",
        )}
      />

      <div className="relative">
        <div
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg",
            isDanger
              ? "border-danger/25 bg-danger/10 text-danger shadow-danger/10"
              : "border-accent/20 bg-accent/10 text-accent shadow-accent/10",
          )}
        >
          {icon}
        </div>
        <h3 className="mt-5 text-base font-semibold text-text">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-muted">{description}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
