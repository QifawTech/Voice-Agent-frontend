import { useEffect, useState } from "react";
import { ShoppingCart, Inbox } from "lucide-react";
import { listOrders } from "@/api/analytics";
import { listTenants } from "@/api/tenants";
import { useAuthStore } from "@/stores/authStore";
import type { OrderEvent } from "@/types/analytics";
import type { Tenant } from "@/types/tenant";
import PageHeader from "@/components/shared/PageHeader";
import Badge, { toneFor } from "@/components/shared/Badge";
import Pagination from "@/components/shared/Pagination";
import { Card } from "@/components/shared/Card";
import { Skeleton } from "@/components/shared/Skeleton";
import { Table, TableWrap, Th, Td, Tr, TableEmpty } from "@/components/shared/Table";
import { formatDate, formatCurrency } from "@/lib/utils";

const EVENT_TYPES = [
  { value: "", label: "All events" },
  { value: "created", label: "Created" },
  { value: "checked", label: "Checked" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [eventType, setEventType] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const limit = 20;

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
        .catch(() => setLoading(false));
    } else if (user.tenant_id) {
      setSelectedTenantId(user.tenant_id);
    } else {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!selectedTenantId) return;
    setLoading(true);
    listOrders(selectedTenantId, page, limit, eventType || undefined)
      .then((res) => {
        setOrders(res.events ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedTenantId, page, eventType]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Orders"
        subtitle={`${total.toLocaleString("en-IN")} order ${total === 1 ? "event" : "events"} recorded`}
        actions={
          <>
            {isSuperAdmin && tenants.length > 0 && (
              <select
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  setPage(1);
                }}
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
            <select
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by event type"
              className="h-9 text-sm"
            >
              {EVENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </>
        }
      />

      <Card className="overflow-hidden">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Order ID</Th>
                <Th>Items</Th>
                <Th align="right">Value</Th>
                <Th>Event</Th>
                <Th>Session</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Tr key={`s${i}`}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <Td key={j}>
                        <Skeleton className="h-3.5 w-full max-w-[120px]" />
                      </Td>
                    ))}
                  </Tr>
                ))}

              {!loading &&
                orders.map((o) => {
                  const items = (o.items as { name: string }[] | null) ?? [];
                  return (
                    <Tr key={o.id}>
                      <Td className="font-mono text-xs text-text-muted">
                        {(o.external_order_id || o.id).slice(0, 16)}
                      </Td>
                      <Td>
                        <span className="flex items-center gap-1.5 text-text">
                          <ShoppingCart size={13} className="text-text-dim" />
                          {items.length > 0
                            ? `${items.length} ${items.length === 1 ? "item" : "items"}`
                            : "—"}
                        </span>
                        {items.length > 0 && (
                          <p className="mt-0.5 max-w-[220px] truncate text-xs text-text-dim">
                            {items.map((i) => i.name).join(", ")}
                          </p>
                        )}
                      </Td>
                      <Td align="right" className="tabular font-medium text-text">
                        {o.order_value != null ? formatCurrency(o.order_value) : "—"}
                      </Td>
                      <Td>
                        <Badge tone={toneFor(o.event_type)}>{o.event_type}</Badge>
                      </Td>
                      <Td className="font-mono text-xs text-text-dim">
                        {o.session_id?.slice(0, 12) || "—"}
                      </Td>
                      <Td className="whitespace-nowrap text-text-muted">
                        {formatDate(o.created_at)}
                      </Td>
                    </Tr>
                  );
                })}

              {!loading && orders.length === 0 && (
                <TableEmpty
                  colSpan={6}
                  icon={<Inbox size={18} />}
                  title="No orders yet"
                  description={
                    eventType
                      ? "No orders match this filter. Try “All events”."
                      : "Orders appear here once the voice agent completes a checkout."
                  }
                />
              )}
            </tbody>
          </Table>
        </TableWrap>

        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
      </Card>
    </div>
  );
}
