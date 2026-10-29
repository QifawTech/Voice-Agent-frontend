import { useCallback, useEffect, useState } from "react";
import { listTenants, updateTenant } from "@/api/tenants";
import { readGreetingSetup, readDefaultGreeting } from "@/types/tenant";
import type { Tenant, GreetingMode } from "@/types/tenant";

/**
 * Resolves "has this tenant set up how their opening greeting is produced?"
 *
 * The choice lives on the tenant (voice_config.greeting_setup). Unlike tenancy,
 * a logged-in user always has a tenant here, so there is no localStorage
 * parking — we read the tenant, and write straight back to it.
 *
 * Setup is REQUIRED: every tenant must pick a mode before the agent should
 * greet callers with anything other than a bare fallback, so the modal this
 * drives is not dismissable (see GreetingSetupModal `required`).
 */
export function useGreetingSetup() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    listTenants(1, 1)
      .then((r) => setTenant(r.tenants[0] ?? null))
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const setup = readGreetingSetup(tenant?.voice_config);
  const isConfigured = setup !== null;

  /**
   * Persist the chosen mode. For "default" we also store the welcome text; it
   * is written as the flat voice_config.greeting, which the agent applies to
   * every language (resolve_language_config falls back to it).
   */
  const save = useCallback(
    async (mode: GreetingMode, welcomeText?: string) => {
      if (!tenant) throw new Error("No tenant to configure.");
      const voiceConfig: Record<string, unknown> = {
        ...(tenant.voice_config ?? {}),
        greeting_setup: { mode, configured: true },
      };
      if (mode === "default" && welcomeText !== undefined) {
        voiceConfig.greeting = welcomeText.trim();
      }
      const updated = await updateTenant(tenant.id, { voice_config: voiceConfig });
      setTenant(updated);
    },
    [tenant],
  );

  return {
    tenant,
    loading,
    isConfigured,
    mode: setup?.mode ?? null,
    currentWelcome: readDefaultGreeting(tenant?.voice_config),
    /** True once we know a tenant exists and has not finished greeting setup. */
    shouldPrompt: !loading && !!tenant && !isConfigured,
    save,
    reload,
  };
}
