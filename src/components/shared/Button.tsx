import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent font-semibold hover:bg-accent-hover",
  secondary:
    "border border-border bg-bg-card text-text hover:border-border-light hover:bg-bg-card-hover",
  ghost: "text-text-muted hover:bg-bg-hover hover:text-text",
  danger: "bg-danger/10 text-danger border border-danger/25 hover:bg-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export default function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  children,
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-ctl font-medium transition-all duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading ? <Loader2 className="animate-spin" size={size === "sm" ? 13 : 15} /> : icon}
      {children}
    </button>
  );
}
