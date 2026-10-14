export interface AnalyticsOverview {
  tenant_id: string;
  restaurant_id: string | null;
  period_start: string;
  period_end: string;
  total_conversations: number;
  total_orders: number;
  total_revenue: number;
  conversion_rate: number;
  avg_session_duration: number;
  top_items: { name: string; count: number }[];
  daily_breakdown: DailyAnalytics[];
}

export interface DailyAnalytics {
  id: string;
  tenant_id: string;
  restaurant_id: string | null;
  date: string;
  total_conversations: number;
  total_orders: number;
  total_revenue: number;
  conversion_rate: number;
  avg_session_duration: number;
  top_items: { name: string; count: number }[] | null;
  peak_hours: number[] | null;
}

export interface ConversationLog {
  id: string;
  tenant_id: string;
  restaurant_id: string | null;
  session_id: string;
  messages: unknown[] | null;
  outcome: string | null;
  order_value: number | null;
  message_count: number;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
}

export interface OrderEvent {
  id: string;
  tenant_id: string;
  restaurant_id: string | null;
  session_id: string;
  external_order_id: string;
  event_type: string;
  order_value: number | null;
  items: unknown[] | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}
