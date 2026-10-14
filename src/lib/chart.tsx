import type { ReactNode } from "react";

/**
 * Categorical series colors — a FIXED order, stepped for the app's WHITE
 * chart surface. Mirrors --color-chart-{1,2,3} in index.css; kept here as
 * literals because Recharts needs real color values, not CSS vars.
 * teal → amber → indigo: mutually distinct in hue and off the semantic
 * green/red. NOTE: re-run the set's CVD/ΔE validation before production —
 * stepped for white but not yet re-certified as a set. Keep in sync with index.css.
 *
 * Assign in order. Never cycle past the end, and never let a filter that
 * changes the series count repaint the survivors — color follows the entity,
 * not its rank.
 */
export const SERIES = {
  1: "#0d9488", // signal teal — brand hue
  2: "#d97706", // amber
  3: "#4f46e5", // indigo
} as const;

export const CHART_INK = {
  grid: "#e4e4e7",
  axis: "#a1a1aa",
  tick: "#52525b",
  surface: "#ffffff",
};

/** Recessive axis defaults: hairline, no axis line, muted tabular ticks. */
export const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: {
    fill: CHART_INK.tick,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums",
  },
  tickMargin: 10,
} as const;

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  /** Per-series value formatter, keyed by dataKey. */
  format?: Record<string, (v: number) => string>;
}

/**
 * Shared tooltip. Values and labels wear text tokens; identity is carried by
 * the colored dot beside them, never by coloring the text itself.
 */
export function ChartTooltip({ active, payload, label, format }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border-light bg-bg-elevated/95 px-3 py-2.5 shadow-pop backdrop-blur-sm">
      <p className="mb-1.5 text-[11px] font-medium text-text-dim">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const key = String(entry.dataKey ?? "");
          const raw = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
          const shown = format?.[key] ? format[key](raw) : raw.toLocaleString("en-IN");
          return (
            <div key={i} className="flex items-center justify-between gap-6 text-xs">
              <span className="flex items-center gap-2 text-text-muted">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="tabular font-semibold text-text">{shown}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Legend as a plain element rather than Recharts' default — identity is a
 * swatch plus text in ink tokens, and it sits with the title instead of
 * stealing a row of plot height.
 */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

export function ChartFrame({ children, height = 260 }: { children: ReactNode; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      {children}
    </div>
  );
}
