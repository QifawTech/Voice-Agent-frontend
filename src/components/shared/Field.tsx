import type { ReactNode } from "react";

interface Props {
  label: string;
  /** Helper text below the control, in the interface's voice. */
  hint?: string;
  /** Validation / error message; replaces the hint and turns it danger-toned. */
  error?: string;
  children: ReactNode;
}

/**
 * A labelled form field — visible label above the control, optional hint or
 * error below. The shared form primitive for every Detail/Form screen so
 * labels, spacing, and error treatment stay identical across the app.
 */
export default function Field({ label, hint, error, children }: Props) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-text-muted">{label}</label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-text-dim">{hint}</p>
      ) : null}
    </div>
  );
}
