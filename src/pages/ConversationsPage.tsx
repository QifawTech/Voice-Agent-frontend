import { Fragment, useEffect, useState } from "react";
import { MessageSquare, Clock, ChevronRight, Inbox } from "lucide-react";
import { listConversations } from "@/api/analytics";
import { listTenants } from "@/api/tenants";
import { useAuthStore } from "@/stores/authStore";
import type { ConversationLog } from "@/types/analytics";
import type { Tenant } from "@/types/tenant";
import PageHeader from "@/components/shared/PageHeader";
import Badge, { toneFor } from "@/components/shared/Badge";
import Pagination from "@/components/shared/Pagination";
import { Card } from "@/components/shared/Card";
import { Skeleton } from "@/components/shared/Skeleton";
import { Table, TableWrap, Th, Td, Tr, TableEmpty } from "@/components/shared/Table";
import { cn, formatDate, formatDuration, formatCurrency } from "@/lib/utils";

const OUTCOMES = [
  { value: "", label: "All outcomes" },
  { value: "ordered", label: "Ordered" },
  { value: "browsed", label: "Browsed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ConversationsPage() {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<ConversationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [outcome, setOutcome] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    listConversations(selectedTenantId, page, limit, outcome || undefined)
      .then((res) => {
        setConversations(res.conversations ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedTenantId, page, outcome]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Conversations"
        subtitle={`${total.toLocaleString("en-IN")} ${total === 1 ? "session" : "sessions"} logged`}
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
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by outcome"
              className="h-9 text-sm"
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
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
                <Th>Session</Th>
                <Th>Outcome</Th>
                <Th align="right">Order value</Th>
                <Th>Duration</Th>
                <Th align="right">Messages</Th>
                <Th>Started</Th>
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
                conversations.map((c) => {
                  const open = expandedId === c.id;
                  const messages =
                    (c.messages as { role: string; content: string }[] | null) ?? [];
                  return (
                    <Fragment key={c.id}>
                      <Tr
                        onClick={() => setExpandedId(open ? null : c.id)}
                        className={cn(open && "bg-bg-hover")}
                      >
                        <Td className="font-mono text-xs text-text-muted">
                          <span className="flex items-center gap-1.5">
                            <ChevronRight
                              size={13}
                              className={cn(
                                "shrink-0 text-text-dim transition-transform duration-200",
                                open && "rotate-90",
                              )}
                            />
                            {(c.session_id || c.id).slice(0, 12)}
                          </span>
                        </Td>
                        <Td>
                          <Badge tone={toneFor(c.outcome)}>
                            {(c.outcome || "in progress").replace(/_/g, " ")}
                          </Badge>
                        </Td>
                        <Td align="right" className="tabular text-text-muted">
                          {c.order_value != null ? formatCurrency(c.order_value) : "—"}
                        </Td>
                        <Td className="text-text-muted">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-text-dim" />
                            {c.duration_seconds ? formatDuration(c.duration_seconds) : "—"}
                          </span>
                        </Td>
                        <Td align="right" className="tabular text-text-muted">
                          <span className="flex items-center justify-end gap-1.5">
                            <MessageSquare size={13} className="text-text-dim" />
                            {c.message_count ?? "—"}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap text-text-muted">
                          {formatDate(c.started_at)}
                        </Td>
                      </Tr>

                      {open && (
                        <tr className="border-b border-border/60">
                          <td colSpan={6} className="bg-bg-subtle px-5 py-4">
                            {messages.length > 0 ? (
                              <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                                {messages.map((msg, i) => {
                                  const isUser = msg.role === "user";
                                  return (
                                    <div
                                      key={i}
                                      className={cn("flex", isUser ? "justify-end" : "justify-start")}
                                    >
                                      <div
                                        className={cn(
                                          "max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm",
                                          isUser
                                            ? "rounded-br-md bg-accent/15 text-text"
                                            : "rounded-bl-md border border-border bg-bg-card text-text",
                                        )}
                                      >
                                        <p className="mb-0.5 text-[11px] font-semibold text-text-dim">
                                          {isUser ? "Customer" : "Agent"}
                                        </p>
                                        {msg.content}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="py-4 text-center text-sm text-text-dim">
                                No message transcript was stored for this session.
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

              {!loading && conversations.length === 0 && (
                <TableEmpty
                  colSpan={6}
                  icon={<Inbox size={18} />}
                  title="No conversations yet"
                  description={
                    outcome
                      ? "No sessions match this filter. Try “All outcomes”."
                      : "Sessions appear here as soon as the voice agent takes its first call."
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
