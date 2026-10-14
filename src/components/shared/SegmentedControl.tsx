import { cn } from "@/lib/utils";

interface Option<T> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  "aria-label"?: string;
}

/**
 * For a small set of mutually exclusive choices, a segmented control beats a
 * <select>: every option is visible and switching costs one click, not two.
 */
export default function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-bg-card p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
              active
                ? "bg-bg-elevated text-text shadow-sm"
                : "text-text-dim hover:text-text-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
