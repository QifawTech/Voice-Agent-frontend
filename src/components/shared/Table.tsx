import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full min-w-[720px] text-sm">{children}</table>;
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  /** Right-align numeric columns so digits stack like a readout. */
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        // Tinted header band separates headers from the data body the way a
        // real data grid does, without a heavy rule.
        "whitespace-nowrap border-b border-border bg-bg-subtle px-5 py-3 text-xs font-semibold text-text-dim",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  /** Pair with the matching Th align so a numeric column lines up. */
  align?: "left" | "right";
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("px-5 py-3.5 align-top", align === "right" && "text-right", className)}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border/60 transition-colors last:border-0",
        onClick && "cursor-pointer hover:bg-bg-hover",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/** In-table empty row — keeps the header visible so columns stay explained. */
export function TableEmpty({
  colSpan,
  icon,
  title,
  description,
}: {
  colSpan: number;
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg-hover text-text-dim">
          {icon}
        </div>
        <p className="mt-3 text-sm font-medium text-text">{title}</p>
        {description && <p className="mt-1 text-xs text-text-dim">{description}</p>}
      </td>
    </tr>
  );
}
