import client from "./client";
import type { AnalyticsOverview, ConversationLog, OrderEvent } from "@/types/analytics";

export async function getOverview(tenantId: string, days = 30, restaurantId?: string): Promise<AnalyticsOverview> {
  const { data } = await client.get<AnalyticsOverview>("/api/v1/analytics/overview", {
    params: { tenant_id: tenantId, days, restaurant_id: restaurantId },
  });
  return data;
}

export async function listConversations(
  tenantId: string,
  page = 1,
  pageSize = 20,
  outcome?: string,
  restaurantId?: string,
): Promise<{ conversations: ConversationLog[]; total: number; page: number; page_size: number }> {
  const { data } = await client.get("/api/v1/analytics/conversations", {
    params: { tenant_id: tenantId, page, page_size: pageSize, outcome, restaurant_id: restaurantId },
  });
  return data;
}

export async function listOrders(
  tenantId: string,
  page = 1,
  pageSize = 20,
  eventType?: string,
  restaurantId?: string,
): Promise<{ events: OrderEvent[]; total: number; page: number; page_size: number }> {
  const { data } = await client.get("/api/v1/analytics/orders", {
    params: { tenant_id: tenantId, page, page_size: pageSize, event_type: eventType, restaurant_id: restaurantId },
  });
  return data;
}
