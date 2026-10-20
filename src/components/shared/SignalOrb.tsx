import { AudioLines, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "connecting" | "live" | "muted";

interface Props {
  state: OrbState;
  className?: string;
}

/**
 * The Voice Test hero. It carries the console's identity motif — the live
 * equalizer — scaled up to the one screen that earns it. Each state is read
 * three ways (color, glyph, and the caption the page renders), never by color
 * alone. Motion is intentional here: a voice agent that is "listening" is the
 * one place a VU meter belongs. All of it flattens under prefers-reduced-motion
 * via the global rule in index.css.
 */

// Heights as a % of the bar track, shaped like a waveform crest rather than a
// flat row; staggered negative delays so the bars never pulse in unison.
const BARS = [
  { h: 42, delay: "-0.60s" },
  { h: 72, delay: "-0.20s" },
  { h: 100, delay: "-0.45s" },
  { h: 58, delay: "-0.10s" },
  { h: 100, delay: "-0.50s" },
  { h: 74, delay: "-0.30s" },
  { h: 48, delay: "-0.15s" },
];

const LABELS: Record<OrbState, string> = {
  idle: "Voice agent idle",
  connecting: "Connecting to the agent",
  live: "Agent is live and listening",
  muted: "Microphone muted",
};

export default function SignalOrb({ state, className }: Props) {
  const isLive = state === "live";

  return (
    <div
      role="img"
      aria-label={LABELS[state]}
      className={cn("relative grid h-40 w-40 place-items-center sm:h-44 sm:w-44", className)}
    >
      {/* Transmitting rings — only while genuinely live. Two, staggered, so the
          orb reads as broadcasting rather than blinking. */}
      {isLive && (
        <>
          <span
            aria-hidden
            className="absolute inset-2 animate-ping rounded-full bg-accent/15"
            style={{ animationDuration: "2.6s" }}
          />
          <span
            aria-hidden
            className="absolute inset-6 animate-ping rounded-full bg-accent/20"
            style={{ animationDuration: "2.6s", animationDelay: "-1.3s" }}
          />
        </>
      )}

      {/* Inner disc */}
      <div
        className={cn(
          "relative grid h-28 w-28 place-items-center rounded-full border transition-all duration-500 sm:h-32 sm:w-32",
          state === "live" && "border-accent/30 bg-accent/15 shadow-[0_0_56px_rgba(15,118,110,0.25)]",
          state === "connecting" && "border-warning/30 bg-warning/12",
          state === "muted" && "border-warning/30 bg-warning/10",
          state === "idle" && "border-border bg-bg-hover",
        )}
      >
        {isLive ? (
          // The signature: a live equalizer, same motif as LiveSignal.
          <span aria-hidden className="flex h-12 items-end gap-[3px]">
            {BARS.map((b, i) => (
              <span
                key={i}
                className="eq-bar w-[3.5px]"
                style={{ height: `${b.h}%`, animationDelay: b.delay }}
              />
            ))}
          </span>
        ) : state === "muted" ? (
          <MicOff aria-hidden size={40} strokeWidth={1.75} className="text-warning" />
        ) : (
          <AudioLines
            aria-hidden
            size={40}
            strokeWidth={1.75}
            className={cn(
              "transition-colors",
              state === "connecting" ? "animate-pulse text-warning" : "text-text-dim",
            )}
          />
        )}
      </div>
    </div>
  );
}
