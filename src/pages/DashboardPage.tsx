import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  ShoppingCart,
  IndianRupee,
  TrendingUp,
  Building2,
  RefreshCw,
  AlertTriangle,
  UtensilsCrossed,
  Inbox,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthStore } from "@/stores/authStore";
import { getOverview } from "@/api/analytics";
import { listTenants } from "@/api/tenants";
import type { AnalyticsOverview, DailyAnalytics } from "@/types/analytics";
import type { Tenant } from "@/types/tenant";
import StatCard from "@/components/shared/StatCard";
import PageHeader from "@/components/shared/PageHeader";
import LiveSignal from "@/components/shared/LiveSignal";
import SegmentedControl from "@/components/shared/SegmentedControl";
import EmptyState from "@/components/shared/EmptyState";
import Button from "@/components/shared/Button";
import { Card, CardHeader, CardBody } from "@/components/shared/Card";
import { DashboardSkeleton } from "@/components/shared/Skeleton";
import { SERIES, CHART_INK, axisProps, ChartTooltip, Legend } from "@/lib/chart";
import {
  formatCurrency,
  formatCompact,
  formatCompactCurrency,
  formatDuration,
  formatShortDate,
  percentChange,
  sumBy,
} from "@/lib/utils";

const RANGES = [
  { value: 7, label: "7D" },
  { value: 14, label: "14D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

/**
 * Split the window in half and compare the later half to the earlier one.
 * This is the only honest period-over-period signal available from a single
 * overview response — label it as such rather than implying a server-computed
 * comparison against the true preceding window.
 */
function halves(rows: DailyAnalytics[]) {
  if (rows.length < 4) return null;
  const mid = Math.floor(rows.length / 2);
  return { previous: rows.slice(0, mid), current: rows.slice(mid) };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [tenantsResolved, setTenantsResolved] = useState(false);
  const [days, setDays] = useState(30);

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    if (!user) return;
    if (isSuperAdmin) {
      listTenants(1, 100)
        .then((res) => {
          setTenants(res.tenants);
          if (res.tenants.length > 0) setSelectedTenantId(res.tenants[0].id);
          else setLoading(false);
        })
        .catch(() => {
          setError("Failed to load tenants.");
          setLoading(false);
        })
        .finally(() => setTenantsResolved(true));
    } else if (user.tenant_id) {
      setSelectedTenantId(user.tenant_id);
      setTenantsResolved(true);
    } else {
      setLoading(false);
      setTenantsResolved(true);
    }
  }, [user, isSuperAdmin]);

  const fetchOverview = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!selectedTenantId) return;
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      getOverview(selectedTenantId, days)
        .then(setData)
        .catch(() =>
          setError(
            "The analytics service didn't respond. Check that the backend is reachable, then try again.",
          ),
        )
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [selectedTenantId, days],
  );

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const daily = data?.daily_breakdown ?? [];

  const chartData = useMemo(
    () =>
      daily.map((d) => ({
        date: formatShortDate(d.date),
        conversations: d.total_conversations,
        orders: d.total_orders,
        revenue: d.total_revenue,
      })),
    [daily],
  );

  const deltas = useMemo(() => {
    const split = halves(daily);
    if (!split) return null;
    const { current, previous } = split;
    const conv = (r: DailyAnalytics[]) => sumBy(r, (d) => d.total_conversations);
    const ord = (r: DailyAnalytics[]) => sumBy(r, (d) => d.total_orders);
    const rev = (r: DailyAnalytics[]) => sumBy(r, (d) => d.total_revenue);
    const rate = (r: DailyAnalytics[]) => {
      const c = conv(r);
      return c === 0 ? 0 : (ord(r) / c) * 100;
    };
    return {
      conversations: percentChange(conv(current), conv(previous)),
      orders: percentChange(ord(current), ord(previous)),
      revenue: percentChange(rev(current), rev(previous)),
      conversion: percentChange(rate(current), rate(previous)),
    };
  }, [daily]);

  const deltaLabel = deltas ? "vs. earlier half" : undefined;
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  // ── Non-data states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Loading your workspace…" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (isSuperAdmin && tenantsResolved && tenants.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <EmptyState
          icon={<Building2 size={24} />}
          title="No workspaces yet"
          description="Analytics appear once you create a tenant and its voice agent starts handling conversations."
          action={
            <Button variant="primary" icon={<Building2 size={15} />} onClick={() => navigate("/tenants")}>
              Create your first tenant
            </Button>
          }
        />
      </div>
    );
  }

  if (!isSuperAdmin && tenantsResolved && !user?.tenant_id) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <EmptyState
          icon={<AlertTriangle size={24} />}
          title="No workspace assigned"
          description="Your account isn't linked to a tenant yet. Ask a super admin to assign one, then refresh this page."
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <EmptyState
          icon={<AlertTriangle size={24} />}
          tone="danger"
          title="Couldn't load analytics"
          description={error || "The analytics service didn't return any data for this workspace."}
          action={
            <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => fetchOverview()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  // Defend against partial payloads — a dashboard should degrade to zeros,
  // never white-screen because one optional array is absent.
  const topItems = data.top_items ?? [];
  const totalConversations = data.total_conversations ?? 0;
  const totalOrders = data.total_orders ?? 0;
  const totalRevenue = data.total_revenue ?? 0;
  const conversionRate = data.conversion_rate ?? 0;
  const avgSession = data.avg_session_duration ?? 0;

  const hasActivity = totalConversations > 0 || totalOrders > 0;
  const maxItemCount = Math.max(1, ...topItems.map((i) => i.count));

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={
          selectedTenant
            ? `${selectedTenant.name} · last ${days} days`
            : `Performance over the last ${days} days`
        }
        actions={
          <>
            {hasActivity && <LiveSignal className="mr-0.5" />}
            {isSuperAdmin && tenants.length > 0 && (
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                aria-label="Select workspace"
                className="h-9 text-sm"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <SegmentedControl
              aria-label="Time range"
              value={days}
              onChange={setDays}
              options={RANGES}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label="Refresh"
              onClick={() => fetchOverview({ silent: true })}
              className="h-9 w-9 px-0"
              icon={
                <RefreshCw
                  size={15}
                  className={refreshing ? "animate-spin" : undefined}
                />
              }
            />
          </>
        }
      />

      {/* ── Key figures ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conversations"
          value={totalConversations.toLocaleString("en-IN")}
          icon={<MessageSquare size={17} />}
          accent={SERIES[1]}
          delta={deltas?.conversations}
          deltaLabel={deltaLabel}
          spark={daily.map((d) => d.total_conversations)}
        />
        <StatCard
          label="Orders"
          value={totalOrders.toLocaleString("en-IN")}
          icon={<ShoppingCart size={17} />}
          accent={SERIES[2]}
          delta={deltas?.orders}
          deltaLabel={deltaLabel}
          spark={daily.map((d) => d.total_orders)}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<IndianRupee size={17} />}
          accent={SERIES[3]}
          delta={deltas?.revenue}
          deltaLabel={deltaLabel}
          spark={daily.map((d) => d.total_revenue)}
        />
        <StatCard
          label="Conversion rate"
          value={`${conversionRate}%`}
          icon={<TrendingUp size={17} />}
          accent={SERIES[1]}
          delta={deltas?.conversion}
          hint={`Avg. session ${formatDuration(Math.round(avgSession))}`}
          spark={daily.map((d) => d.conversion_rate ?? 0)}
        />
      </div>

      {/* ── Trends ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Single series: the title names it, so no legend box. */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue"
            subtitle={`Daily total · last ${days} days`}
            action={
              <span className="text-sm font-semibold text-text">
                {formatCurrency(totalRevenue)}
              </span>
            }
          />
          <CardBody className="pt-4">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {/* right margin leaves room for the final x tick to render
                    in full rather than being clipped by the plot edge */}
                <AreaChart data={chartData} margin={{ top: 4, right: 20, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="revenueWash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[3]} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={SERIES[3]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke={CHART_INK.grid}
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="date"
                    {...axisProps}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    {...axisProps}
                    width={56}
                    tickFormatter={(v: number) => formatCompactCurrency(v)}
                  />
                  <Tooltip
                    cursor={{ stroke: CHART_INK.axis, strokeWidth: 1 }}
                    content={
                      <ChartTooltip format={{ revenue: (v) => formatCurrency(v) }} />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={SERIES[3]}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="url(#revenueWash)"
                    activeDot={{
                      r: 4,
                      fill: SERIES[3],
                      stroke: CHART_INK.surface,
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Top items decompose Orders, so they carry the Orders hue. */}
        <Card>
          <CardHeader title="Top ordered items" subtitle={`Across the last ${days} days`} />
          <CardBody className="pt-4">
            {topItems.length > 0 ? (
              <ol className="space-y-3.5">
                {topItems.slice(0, 6).map((item, i) => (
                  <li key={item.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="tabular w-4 shrink-0 text-xs text-text-dim">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm text-text">{item.name}</span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold text-text">
                        {item.count}
                      </span>
                    </div>
                    <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-bg-hover">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${(item.count / maxItemCount) * 100}%`,
                          backgroundColor: SERIES[2],
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Inbox size={22} className="text-text-dim" />
                <p className="mt-3 text-sm text-text-muted">No items ordered yet</p>
                <p className="mt-1 text-xs text-text-dim">
                  Ranked items appear once orders come in.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Two series, same unit (counts) — one axis, legend always present. */}
      <Card>
        <CardHeader
          title="Conversations vs. orders"
          subtitle="Daily counts on a shared scale"
          action={
            <Legend
              items={[
                { label: "Conversations", color: SERIES[1] },
                { label: "Orders", color: SERIES[2] },
              ]}
            />
          }
        />
        <CardBody className="pt-4">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 20, bottom: 0, left: -12 }}
                barGap={2}
              >
                <CartesianGrid vertical={false} stroke={CHART_INK.grid} strokeWidth={1} />
                <XAxis dataKey="date" {...axisProps} interval="preserveStartEnd" minTickGap={28} />
                <YAxis {...axisProps} width={48} tickFormatter={(v: number) => formatCompact(v)} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.035)" }}
                  content={<ChartTooltip />}
                />
                <Bar
                  dataKey="conversations"
                  name="Conversations"
                  fill={SERIES[1]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="orders"
                  name="Orders"
                  fill={SERIES[2]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {!hasActivity && (
        <div className="flex items-start gap-3 rounded-card border border-border bg-bg-card/60 px-4 py-3.5">
          <UtensilsCrossed size={16} className="mt-0.5 shrink-0 text-text-dim" />
          <p className="text-sm text-text-muted">
            No activity recorded in this window yet. Charts will fill in once the voice agent
            starts handling live conversations —{" "}
            <button
              onClick={() => navigate("/voice-test")}
              className="font-medium text-accent-light underline-offset-2 hover:underline"
            >
              run a voice test
            </button>{" "}
            to generate your first session.
          </p>
        </div>
      )}
    </div>
  );
}
