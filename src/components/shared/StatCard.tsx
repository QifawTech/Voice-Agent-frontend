import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import Sparkline from "./Sparkline";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  /** Percent change vs. the preceding window of equal length. */
  delta?: number | null;
  deltaLabel?: string;
  /** Series for the inline trend shape. */
  spark?: number[];
  accent?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  hint,
  icon,
  delta,
  deltaLabel,
  spark,
  accent = "#0d9488",
  className,
}: Props) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const direction = !hasDelta ? "flat" : delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat";

  const deltaStyles = {
    up: "bg-success/10 text-success",
    down: "bg-danger/10 text-danger",
    flat: "bg-bg-hover text-text-dim",
  }[direction];

  const DeltaIcon = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }[direction];

  return (
    <div
      className={cn(
        "sheen group relative overflow-hidden rounded-card border border-border bg-bg-card p-5",
        "transition-colors duration-200 hover:border-border-light",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ctl border transition-colors"
          style={{
            color: accent,
            backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${accent} 22%, transparent)`,
          }}
        >
          {icon}
        </div>
      </div>

      {/* The readout is the signature element: the display face + tabular
          figures make each value read like an instrument panel, and tabular
          keeps digits from jittering as the number updates. */}
      <p className="tabular mt-3 font-display text-[1.9rem] font-semibold leading-none tracking-tight text-text">
        {value}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {hasDelta && (
          <span
            className={cn(
              "tabular inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              deltaStyles,
            )}
          >
            <DeltaIcon size={11} strokeWidth={2.5} />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {/* The delta label qualifies the chip, so it only appears with one —
            otherwise "vs. earlier half" dangles beside nothing. */}
        {(hint || (hasDelta && deltaLabel)) && (
          <span className="truncate text-xs text-text-dim">{hint ?? deltaLabel}</span>
        )}
        {!hasDelta && !hint && <span className="text-xs text-text-dim">No prior data</span>}
      </div>

      {spark && spark.length > 1 && (
        <Sparkline
          data={spark}
          color={accent}
          className="pointer-events-none mt-4 h-8 w-full opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
    </div>
  );
}
