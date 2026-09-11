// Shapes returned by the ambassador-program server functions (see
// supabase/migrations/202609110004_program_rpcs.sql). All money is cents.

export type Classification = "NEW" | "RESIDUAL" | "UNATTRIBUTED" | "EXCLUDED" | null;
export type SaleStatus = "draft" | "awaiting_payment" | "paid" | "fulfilled" | "cancelled" | "refunded" | "disputed";
export type AmbassadorStatus = "pending" | "active" | "suspended" | "inactive" | "archived";

export interface Tier {
  name: string;
  min_cents: number;
  bps: number;
}

export interface AmbassadorDashboard {
  profile: { first_name: string; public_id: string; code: string; referral_path: string; status: AmbassadorStatus; start_date: string | null };
  month: string;
  is_current_month: boolean;
  tiers: Tier[];
  residual_bps: number;
  residual_months: number;
  rank: { name: string; bps: number; min_cents: number; next_name: string | null; next_min_cents: number | null; to_next_cents: number | null };
  qualified_cents: number;
  new_revenue_cents: number;
  residual_revenue_cents: number;
  new_commission_cents: number;
  residual_commission_cents: number;
  adjustment_cents: number;
  total_commission_cents: number;
  statement_status: string;
  new_customers: number;
  returning_customers: number;
  clicks: number;
  visitors: number;
  inquiries: number;
  inquiry_conversions: number;
  lifetime_revenue_cents: number;
  lifetime_commission_cents: number;
  paid_to_date_cents: number;
  customers: {
    label: string;
    since: string | null;
    status: string;
    residual_expires_on: string | null;
    orders: number;
    revenue_cents: number;
    last_purchase_on: string | null;
  }[];
  recent_sales: {
    date: string;
    customer: string;
    type: Classification;
    qualified_cents: number;
    rate_bps: number;
    commission_cents: number;
    status: SaleStatus;
  }[];
  payouts: { paid_on: string; amount_cents: number; month: string; reference: string | null }[];
  statements: { month: string; tier_name: string | null; qualified_cents: number; final_cents: number; paid_cents: number; status: string }[];
  leaderboard: { position: number; label: string; tier_name: string; qualified_cents: number; is_me: boolean }[] | null;
}

export interface CustomerSummary {
  id: string;
  public_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  duplicate_flag: boolean;
  merged_into: string | null;
  attribution_locked: boolean;
  orders: number;
  lifetime_cents: number;
  first_purchase_on: string | null;
  last_purchase_on: string | null;
  attribution: {
    id: string;
    partner_id: string;
    partner_name: string;
    status: "pending" | "active" | "expired";
    source: string;
    code_used: string | null;
    first_purchase_on: string | null;
    residual_starts_on: string | null;
    residual_expires_on: string | null;
  } | null;
}

export interface OrderItem {
  id?: string;
  product_slug: string | null;
  product_name: string;
  quantity: number;
  line_cents: number | null;
  eligible?: boolean;
}

export interface OrderRecord {
  id: string;
  public_id: string;
  customer_id: string;
  request_id: string | null;
  referred_partner_id: string | null;
  referral_code: string | null;
  referral_source: string | null;
  partner_id: string | null;
  partner_name: string | null;
  referred_partner_name: string | null;
  order_date: string;
  paid_on: string | null;
  status: SaleStatus;
  fulfillment_status: string;
  fulfillment_method: string | null;
  payment_method: string | null;
  product_paid_cents: number;
  discount_cents: number;
  shipping_cents: number;
  excluded_cents: number;
  gross_cents: number;
  qualified_cents: number;
  refunded_cents: number;
  manual_exclude: boolean;
  exclude_reason: string | null;
  classification: Classification;
  commission_type: string;
  commission_bps: number;
  commission_cents: number;
  flags: string[];
  reference: string | null;
  notes: string | null;
  created_at: string;
  customer: CustomerSummary;
  customer_is_new?: boolean;
  items: OrderItem[];
  statement: {
    month: string;
    qualified_cents: number;
    new_revenue_cents: number;
    residual_revenue_cents: number;
    tier_name: string;
    tier_bps: number;
    new_commission_cents: number;
    residual_commission_cents: number;
    final_cents: number;
  } | null;
  before?: { qualified_cents: number; tier_name: string; tier_bps?: number; final_cents: number };
  history?: { action: string; at: string; reason: string | null }[];
}

export interface OrderRow {
  id: string;
  public_id: string;
  order_date: string;
  paid_on: string | null;
  status: SaleStatus;
  fulfillment_status: string;
  payment_method: string | null;
  product_paid_cents: number;
  qualified_cents: number;
  refunded_cents: number;
  classification: Classification;
  commission_bps: number;
  commission_cents: number;
  flags: string[];
  reference: string | null;
  partner_name: string | null;
  customer_id: string;
  customer_public_id: string;
  customer_name: string;
  items: string | null;
}

export interface Ambassador {
  id: string;
  public_id: string;
  user_id: string | null;
  name: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  start_date: string | null;
  status: AmbassadorStatus;
  notes: string | null;
  code: string;
  referral_path: string;
  has_login: boolean;
  created_at: string;
  last_activity_at: string | null;
  application_id: string | null;
  // list-only stats
  month?: string;
  tier_name?: string;
  qualified_cents?: number;
  new_revenue_cents?: number;
  residual_revenue_cents?: number;
  commission_cents?: number;
  customers?: number;
  active_customers?: number;
  clicks?: number;
  lifetime_cents?: number;
}

export interface RequestRecord {
  id: string;
  kind: "product" | "coa" | "application" | "availability" | "order";
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  product: string | null;
  lot: string | null;
  message: string;
  referral_code: string | null;
  referral_source: string | null;
  partner_id: string | null;
  ambassador_name: string | null;
  order_items: { slug?: string; name: string; quantity: number }[] | null;
  payment_method: string | null;
  payment_other: string | null;
  fulfillment_method: string | null;
  created_at: string;
  status: string;
  email_status: string;
  customer_id: string | null;
  order_id: string | null;
  decision_reason: string | null;
  existing_customer: CustomerSummary | null;
}

export interface Statement {
  id: string;
  partner_id: string;
  month: string;
  new_revenue_cents: number;
  residual_revenue_cents: number;
  qualified_cents: number;
  new_customers: number;
  returning_customers: number;
  tier_name: string | null;
  tier_bps: number | null;
  residual_bps: number | null;
  new_commission_cents: number;
  residual_commission_cents: number;
  adjustment_cents: number;
  final_cents: number;
  paid_cents: number;
  balance_cents: number;
  status: "pending" | "approved" | "paid" | "held" | "cancelled";
  notes: string | null;
  ambassador_name: string;
  ambassador_public_id: string;
  adjustments: { cents: number; reason: string; at: string }[];
  payouts: { amount_cents: number; paid_on: string; reference: string | null; notes: string | null }[];
}

export interface ProgramSettings {
  tiers: Tier[];
  residual_bps: number;
  residual_months: number;
  referral_window_days: number;
  reacquisition: "never" | "allow";
  excluded_products: string[];
  leaderboard_enabled: boolean;
  timezone: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting payment",
  paid: "Paid / confirmed",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
};
export const FULFILMENT_LABEL: Record<string, string> = {
  unfulfilled: "Not yet sent",
  ready: "Ready",
  shipped: "Shipped",
  picked_up: "Picked up",
  delivered: "Delivered",
};
