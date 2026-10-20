import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "info" | "warning" | "accent";

const tones: Record<Tone, string> = {
  neutral: "border-border-light bg-bg-hover text-text-muted",
  success: "border-success/25 bg-success/10 text-success",
  danger: "border-danger/25 bg-danger/10 text-danger",
  info: "border-info/25 bg-info/10 text-info",
  warning: "border-warning/25 bg-warning/10 text-warning",
  accent: "border-accent/25 bg-accent/10 text-accent-light",
};

/** Maps a server-side status string onto a visual tone. */
export function toneFor(status?: string | null): Tone {
  switch (status) {
    case "ordered":
    case "created":
    case "completed":
      return "success";
    case "cancelled":
    case "failed":
      return "danger";
    case "browsed":
    case "checked":
      return "info";
    case "in_progress":
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
}

interface Props {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}

export default function Badge({ children, tone = "neutral", icon, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
