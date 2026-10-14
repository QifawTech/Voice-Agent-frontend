import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, ChevronRight, Link2, X } from "lucide-react";
import { listTenants, createTenant } from "@/api/tenants";
import { clearPendingTenancy, takePendingTenancy } from "@/hooks/useTenancy";
import type { Tenant, TenantCreate } from "@/types/tenant";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardHeader, CardBody } from "@/components/shared/Card";
import { useAuthStore } from "@/stores/authStore";
import { Skeleton } from "@/components/shared/Skeleton";
import { PLATFORMS } from "@/lib/constants";
import { initials } from "@/lib/utils";

/** Pull a readable message out of whatever the API rejected us with. */
function errorText(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;
  return typeof detail === "string" ? detail : fallback;
}

export default function TenantsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TenantCreate>({ name: "", slug: "", platform: "standalone" });
  const [error, setError] = useState("");

  const isSuperAdmin = user?.role === "super_admin";

  // One account, one tenant. A multi-tenant product's businesses are
  // sub-tenants, synced from the customer's own API on the tenant detail page —
  // never created here. So once a tenant exists this page is read-only. The
  // backend refuses a second tenant with 409 regardless; this just keeps the UI
  // from offering something that cannot succeed.
  //
  // Super-admins are the exception, and must stay one: they see every tenant on
  // this page, so a count-based gate would hide the button from the only people
  // who legitimately create tenants for customers. This mirrors the exemption in
  // TenantService.create_tenant — if one side changes, change both.
  const canCreate = !loading && (isSuperAdmin || tenants.length === 0);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      const res = await listTenants();
      setTenants(res.tenants ?? []);
    } catch {
      setError("Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      // If they answered the single/multi prompt before having a tenant, that
      // answer was parked locally — apply it to the tenant they just made.
      const pending = takePendingTenancy();
      await createTenant(pending ? { ...form, tenancy_type: pending } : form);
      if (pending) clearPendingTenancy();
      setShowCreate(false);
      setForm({ name: "", slug: "", platform: "standalone" });
      await loadTenants();
    } catch (e) {
      setError(
        errorText(e, "Couldn't create the tenant. That slug may already be taken."),
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Tenants"
        subtitle={
          loading
            ? "Loading…"
            : `${tenants.length} ${tenants.length === 1 ? "tenant" : "tenants"}`
        }
        actions={
          canCreate &&
          !showCreate && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>
              Add tenant
            </Button>
          )
        }
      />

      {error && (
        <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {showCreate && canCreate && (
        <Card>
          <CardHeader
            title="Create a tenant"
            subtitle="This is your account. The slug becomes its public identifier."
            action={
              <button
                onClick={() => setShowCreate(false)}
                aria-label="Cancel"
                className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-bg-hover hover:text-text"
              >
                <X size={15} />
              </button>
            }
          />
          <CardBody className="pt-4">
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">
                  Business name
                </span>
                <input
                  placeholder="SOPZY"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-10 w-full"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">Slug</span>
                <input
                  placeholder="sopzy"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  required
                  className="h-10 w-full font-mono text-xs"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">Platform</span>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="h-10 w-full"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit" variant="primary" loading={creating}>
                  Create tenant
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="sheen rounded-card border border-border bg-bg-card p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} />}
          title="No tenant yet"
          description="A tenant is your account — the product everything else hangs off. Create it to connect your API and configure the voice agent. If your product serves multiple businesses, you'll sync those as sub-tenants afterwards."
          action={
            canCreate && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>
                Create your tenant
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3">
          {tenants.map((t) => (
            <Card
              key={t.id}
              interactive
              className="group px-5 py-4"
            >
              <div
                onClick={() => navigate(`/tenants/${t.id}`)}
                className="flex items-center gap-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-sm font-semibold text-accent-light">
                  {initials(t.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-medium text-text">{t.name}</h3>
                    <Badge tone="accent">{t.platform}</Badge>
                    <Badge tone={t.is_active ? "success" : "neutral"}>
                      {t.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-text-dim">/{t.slug}</p>
                </div>

                {t.api_base_url && (
                  <Badge
                    tone={t.api_validated ? "success" : "warning"}
                    icon={<Link2 size={11} />}
                    className="hidden sm:inline-flex"
                  >
                    {t.api_validated ? "API connected" : "API unverified"}
                  </Badge>
                )}

                <ChevronRight
                  size={16}
                  className="shrink-0 text-text-dim transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-text-muted"
                />
              </div>
            </Card>
          ))}

          {!isSuperAdmin && (
            <p className="px-1 text-xs leading-relaxed text-text-dim">
              One account has one tenant. If your product serves multiple
              businesses, open the tenant above and sync them as sub-tenants
              from your own API — they aren't created here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
