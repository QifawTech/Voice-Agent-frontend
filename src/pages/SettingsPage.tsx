import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AtSign,
  Check,
  KeyRound,
  Layers,
  Loader2,
  Save,
  ShieldCheck,
  Store,
  User as UserIcon,
} from "lucide-react";
import { changePassword, updateMe } from "@/api/auth";
import { useTenancy } from "@/hooks/useTenancy";
import { useAuthStore } from "@/stores/authStore";
import type { TenancyType } from "@/types/tenant";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import Field from "@/components/shared/Field";
import { Card, CardBody, CardHeader } from "@/components/shared/Card";
import { Skeleton } from "@/components/shared/Skeleton";
import { cn, formatDate } from "@/lib/utils";

/** Pull a readable message out of whatever the API rejected us with. */
function errorText(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;
  return typeof detail === "string" ? detail : fallback;
}

/**
 * A per-section status line.
 *
 * Each section saves independently, so a single page-level banner would be
 * ambiguous — "Saved" where? This keeps the outcome next to the form that
 * produced it.
 */
function Status({ state }: { state: { tone: "ok" | "bad"; text: string } | null }) {
  if (!state) return null;
  return (
    <p
      className={cn(
        "mt-4 flex items-center gap-2 rounded-ctl border px-3 py-2 text-sm",
        state.tone === "ok"
          ? "border-success/30 bg-success/10 text-success"
          : "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      {state.tone === "ok" && <Check size={14} className="shrink-0" />}
      {state.text}
    </p>
  );
}

/** One row of the read-only account summary. */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="min-w-0 text-right text-sm text-text">{value}</span>
    </div>
  );
}

const TENANCY_OPTIONS = [
  {
    key: "single" as TenancyType,
    icon: Store,
    title: "Single Tenant",
    body: "One product or application. The voice agent serves your own customers directly.",
    example: "A single restaurant's website",
  },
  {
    key: "multi" as TenancyType,
    icon: Layers,
    title: "Multi Tenant",
    body: "Your product serves many tenants, each with their own customers and data.",
    example: "A platform hosting many restaurants",
  },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const tenancy = useTenancy();

  const isSuperAdmin = user?.role === "super_admin";

  // ── Profile ──────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ full_name: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<
    { tone: "ok" | "bad"; text: string } | null
  >(null);

  // Seed the form once the profile arrives (it loads after first paint).
  useEffect(() => {
    if (user) setProfile({ full_name: user.full_name, email: user.email });
  }, [user]);

  const profileDirty =
    !!user &&
    (profile.full_name.trim() !== user.full_name || profile.email.trim() !== user.email);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      // Send only what actually changed, so a PUT that touches nothing is
      // never mistaken for an email change and re-checked for uniqueness.
      const changes: { full_name?: string; email?: string } = {};
      if (profile.full_name.trim() !== user.full_name)
        changes.full_name = profile.full_name.trim();
      if (profile.email.trim() !== user.email) changes.email = profile.email.trim();

      const updated = await updateMe(changes);
      setUser(updated);
      setProfileStatus({ tone: "ok", text: "Profile updated." });
    } catch (e) {
      setProfileStatus({
        tone: "bad",
        text: errorText(e, "Couldn't save your profile. Please try again."),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Password ─────────────────────────────────────────────────────
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ tone: "ok" | "bad"; text: string } | null>(
    null,
  );

  const pwTooShort = pw.next.length > 0 && pw.next.length < 8;
  const pwMismatch = pw.confirm.length > 0 && pw.next !== pw.confirm;
  const pwReady =
    pw.current.length > 0 && pw.next.length >= 8 && pw.next === pw.confirm;

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    setPwStatus(null);
    try {
      await changePassword({ current_password: pw.current, new_password: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setPwStatus({
        tone: "ok",
        text: "Password changed. Your current session stays signed in.",
      });
    } catch (e) {
      setPwStatus({
        tone: "bad",
        text: errorText(e, "Couldn't change your password. Please try again."),
      });
    } finally {
      setSavingPw(false);
    }
  }

  // ── Tenancy type ─────────────────────────────────────────────────
  const [savingTenancy, setSavingTenancy] = useState<TenancyType | null>(null);
  const [tenancyStatus, setTenancyStatus] = useState<
    { tone: "ok" | "bad"; text: string } | null
  >(null);

  async function chooseTenancy(t: TenancyType) {
    if (t === tenancy.tenancyType) return;
    setSavingTenancy(t);
    setTenancyStatus(null);
    try {
      await tenancy.choose(t);
      setTenancyStatus({
        tone: "ok",
        text: tenancy.tenant
          ? `Switched to ${t === "multi" ? "Multi" : "Single"} Tenant.`
          : "Saved. This will be applied to the product you create.",
      });
    } catch (e) {
      // The backend refuses multi -> single while sub-tenants are still
      // active, and its message names the count — show it verbatim rather
      // than flattening it into a generic failure.
      setTenancyStatus({
        tone: "bad",
        text: errorText(e, "Couldn't change the tenancy type. Please try again."),
      });
    } finally {
      setSavingTenancy(null);
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Your account and how your product is set up"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* ── Profile ─────────────────────────────────────────── */}
          <Card>
            <CardHeader
              title="Profile"
              subtitle="The name and email on your admin account"
            />
            <CardBody className="pt-4">
              {!user ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <form onSubmit={saveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full name">
                      <input
                        value={profile.full_name}
                        onChange={(e) =>
                          setProfile({ ...profile, full_name: e.target.value })
                        }
                        placeholder="Rahul Sharma"
                        className="w-full"
                      />
                    </Field>
                    <Field
                      label="Email address"
                      hint="You'll sign in with this from now on."
                    >
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                        placeholder="you@company.com"
                        className="w-full"
                      />
                    </Field>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    icon={<Save size={15} />}
                    loading={savingProfile}
                    disabled={!profileDirty || !profile.full_name.trim() || !profile.email.trim()}
                  >
                    Save changes
                  </Button>
                  <Status state={profileStatus} />
                </form>
              )}
            </CardBody>
          </Card>

          {/* ── Password ────────────────────────────────────────── */}
          <Card>
            <CardHeader
              title="Password"
              subtitle="Changing it won't sign you out of this device"
            />
            <CardBody className="pt-4">
              <form onSubmit={savePassword} className="space-y-4">
                <Field label="Current password">
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={pw.current}
                    onChange={(e) => setPw({ ...pw, current: e.target.value })}
                    className="w-full"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="New password"
                    hint={pwTooShort ? undefined : "At least 8 characters."}
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={pw.next}
                      onChange={(e) => setPw({ ...pw, next: e.target.value })}
                      className="w-full"
                    />
                    {pwTooShort && (
                      <p className="mt-1.5 text-xs text-danger">
                        Must be at least 8 characters.
                      </p>
                    )}
                  </Field>
                  <Field label="Confirm new password">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={pw.confirm}
                      onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                      className="w-full"
                    />
                    {pwMismatch && (
                      <p className="mt-1.5 text-xs text-danger">
                        These two don't match.
                      </p>
                    )}
                  </Field>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  icon={<KeyRound size={15} />}
                  loading={savingPw}
                  disabled={!pwReady}
                >
                  Update password
                </Button>
                <Status state={pwStatus} />
              </form>
            </CardBody>
          </Card>

          {/* ── Tenancy type ────────────────────────────────────── */}
          <Card>
            <CardHeader
              title="Tenancy type"
              subtitle="How the voice agent is wired for your product"
              action={
                tenancy.tenancyType ? (
                  <Badge tone="accent">
                    {tenancy.tenancyType === "multi" ? "Multi tenant" : "Single tenant"}
                  </Badge>
                ) : (
                  <Badge tone="warning">Not set</Badge>
                )
              }
            />
            <CardBody className="pt-4">
              {isSuperAdmin ? (
                // A super-admin has many tenants, and this page has no tenant
                // picker — editing "the" tenancy type here would silently pick
                // one of them. Send them to the tenant they mean instead.
                <p className="text-sm text-text-muted">
                  Tenancy type is set per tenant. Open the one you want from{" "}
                  <Link
                    to="/tenants"
                    className="font-medium text-accent-light underline-offset-2 hover:underline"
                  >
                    Tenants
                  </Link>{" "}
                  to change it.
                </p>
              ) : tenancy.loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-36 w-full" />
                  <Skeleton className="h-36 w-full" />
                </div>
              ) : (
                <>
                  {!tenancy.tenant && (
                    <p className="mb-4 text-sm text-text-muted">
                      You haven't created a product yet. Your choice is saved and
                      applied to the first one you create.
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {TENANCY_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const active = tenancy.tenancyType === opt.key;
                      const busy = savingTenancy === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => chooseTenancy(opt.key)}
                          disabled={savingTenancy !== null}
                          aria-pressed={active}
                          className={cn(
                            "rounded-xl border p-4 text-left transition-all",
                            "disabled:pointer-events-none disabled:opacity-60",
                            active
                              ? "border-accent bg-accent/[0.07]"
                              : "border-border bg-bg/40 hover:border-accent/40",
                          )}
                        >
                          <div className="mb-2.5 flex items-center justify-between">
                            <div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg",
                                active ? "bg-accent/20" : "bg-bg",
                              )}
                            >
                              <Icon
                                size={17}
                                className={active ? "text-accent" : "text-text-dim"}
                              />
                            </div>
                            {busy ? (
                              <Loader2 size={16} className="animate-spin text-accent" />
                            ) : (
                              active && <Check size={16} className="text-accent" />
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-text">{opt.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-text-muted">
                            {opt.body}
                          </p>
                          <p className="mt-2.5 text-xs text-text-dim">
                            e.g. {opt.example}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <Status state={tenancyStatus} />

                  <p className="mt-4 text-xs text-text-dim">
                    Switching to Single Tenant is blocked while you still have active
                    tenants, since their widgets would stop working. Deactivate them
                    first.
                  </p>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ── Account info (read-only) ──────────────────────────── */}
        <div className="xl:col-span-1">
          <Card>
            <CardHeader title="Account" subtitle="Read-only" />
            <CardBody className="pt-2">
              {!user ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  <InfoRow
                    label="Role"
                    value={
                      <Badge tone={isSuperAdmin ? "accent" : "neutral"}>
                        {isSuperAdmin ? (
                          <>
                            <ShieldCheck size={11} /> Super admin
                          </>
                        ) : (
                          <>
                            <UserIcon size={11} /> Tenant admin
                          </>
                        )}
                      </Badge>
                    }
                  />
                  <InfoRow
                    label="Email"
                    value={
                      <span className="flex items-center justify-end gap-1.5">
                        <AtSign size={12} className="shrink-0 text-text-dim" />
                        <span className="truncate">{user.email}</span>
                      </span>
                    }
                  />
                  <InfoRow
                    label="Status"
                    value={
                      <Badge tone={user.is_active ? "success" : "danger"}>
                        {user.is_active ? "Active" : "Deactivated"}
                      </Badge>
                    }
                  />
                  <InfoRow
                    label="Product"
                    value={
                      tenancy.tenant ? (
                        <Link
                          to={`/tenants/${tenancy.tenant.id}`}
                          className="font-medium text-accent-light underline-offset-2 hover:underline"
                        >
                          {tenancy.tenant.name}
                        </Link>
                      ) : isSuperAdmin ? (
                        "All tenants"
                      ) : (
                        <span className="text-text-dim">None yet</span>
                      )
                    }
                  />
                  <InfoRow label="Joined" value={formatDate(user.created_at)} />
                  <InfoRow
                    label="Last sign-in"
                    value={
                      user.last_login_at ? (
                        formatDate(user.last_login_at)
                      ) : (
                        <span className="text-text-dim">—</span>
                      )
                    }
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
