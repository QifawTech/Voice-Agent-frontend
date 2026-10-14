import type { ReactNode } from "react";
import { AudioLines } from "lucide-react";

interface Props {
  /** The product line under the mark; same on both auth screens. */
  title?: string;
  /** What this screen is for, in the interface's voice. */
  subtitle: string;
  children: ReactNode;
  /** The cross-link row (e.g. "Don't have an account?"). */
  footer?: ReactNode;
}

/**
 * The frame both auth screens share, so they can't drift apart. It reuses the
 * app shell's own ambient language — a single top accent wash + the masked
 * grid — instead of the generic twin blur-orbs, so signing in already looks
 * like the console it leads to. The brand mark is the same AudioLines waveform
 * glyph the sidebar uses; identity lives there, not in an accented headline word.
 */
export default function AuthShell({ title = "Voice Agent", subtitle, children, footer }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
      {/* Same ambient treatment as DashboardLayout — not decorative orbs. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-gradient-to-b from-accent/[0.07] to-transparent"
      />
      <div
        aria-hidden
        className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[460px] opacity-40"
      />

      <div className="animate-fade-up relative z-10 w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-accent/25 bg-accent/12">
            <AudioLines size={26} strokeWidth={2} className="text-accent-light" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
        </div>

        <div className="sheen rounded-lg border border-border bg-bg-card p-7 shadow-pop sm:p-8">
          {children}
          {footer && <div className="mt-6 border-t border-border pt-5">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
