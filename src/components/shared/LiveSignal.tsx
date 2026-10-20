import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  className?: string;
}

/**
 * A live-equalizer indicator — the console's signature motif. It stands for
 * the voice agent being online and listening, so the bars are allowed to run
 * on their own (a VU meter earns continuous motion); they flatten under
 * prefers-reduced-motion via the global rule in index.css.
 */
export default function LiveSignal({ label = "Live", className }: Props) {
  // Staggered delays so the five bars read as a waveform, not a blink.
  const delays = ["-0.9s", "-0.3s", "-0.6s", "-0.15s", "-0.75s"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-chip border border-accent/25 bg-accent/10 px-2.5 py-1",
        className,
      )}
    >
      <span aria-hidden className="flex h-3.5 items-end gap-[2px]">
        {delays.map((d, i) => (
          <span key={i} className="eq-bar h-full" style={{ animationDelay: d }} />
        ))}
      </span>
      <span className="text-xs font-medium text-accent-light">{label}</span>
    </span>
  );
}
