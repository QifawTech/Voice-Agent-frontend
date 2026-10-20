import { useCallback, useEffect, useState } from "react";
import { listTenants, updateTenant } from "@/api/tenants";
import type { Tenant, TenancyType } from "@/types/tenant";

const PENDING_KEY = "pending_tenancy_type";
const DISMISSED_KEY = "tenancy_prompt_dismissed";

/**
 * Resolves "has this account said whether it's single or multi tenant?"
 *
 * The choice lives on the tenant (tenants.tenancy_type, NULL = unanswered).
 * A brand-new user has no tenant yet, so their answer is parked in
 * localStorage and applied to the first tenant they create — that way we can
 * ask the question early without forcing them to create a tenant first.
 */
export function useTenancy() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<TenancyType | null>(
    () => (localStorage.getItem(PENDING_KEY) as TenancyType) || null,
  );
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "1",
  );

  const reload = useCallback(() => {
    setLoading(true);
    listTenants(1, 1)
      .then((r) => setTenant(r.tenants[0] ?? null))
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  /** The effective answer, from the tenant if it exists, else the parked one. */
  const tenancyType: TenancyType | null =
    (tenant?.tenancy_type as TenancyType | null) ?? pending ?? null;

  const isResolved = tenancyType !== null;

  /** Save the choice. Writes to the tenant when there is one. */
  const choose = useCallback(
    async (t: TenancyType) => {
      if (tenant) {
        const updated = await updateTenant(tenant.id, { tenancy_type: t });
        setTenant(updated);
        localStorage.removeItem(PENDING_KEY);
        setPending(null);
      } else {
        // No tenant yet — remember it and apply it at creation time.
        localStorage.setItem(PENDING_KEY, t);
        setPending(t);
      }
      localStorage.removeItem(DISMISSED_KEY);
      setDismissed(false);
    },
    [tenant],
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }, []);

  /** Bring the prompt back — from the banner, or from voice agent setup. */
  const reopen = useCallback(() => {
    localStorage.removeItem(DISMISSED_KEY);
    setDismissed(false);
  }, []);

  return {
    tenant,
    loading,
    tenancyType,
    isResolved,
    /** True once we know they haven't answered and haven't waved us away. */
    shouldPrompt: !loading && !isResolved && !dismissed,
    /** True when they haven't answered, regardless of dismissal. */
    needsChoice: !loading && !isResolved,
    choose,
    dismiss,
    reopen,
    reload,
  };
}

/** Consumed by the tenant-create form so a parked choice is applied. */
export function takePendingTenancy(): TenancyType | null {
  const v = localStorage.getItem(PENDING_KEY) as TenancyType | null;
  return v || null;
}

export function clearPendingTenancy() {
  localStorage.removeItem(PENDING_KEY);
}
