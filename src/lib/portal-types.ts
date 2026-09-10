export interface Partner {
  id: string;
  name: string;
  email?: string;
  code: string;
  status?: string;
  rate_bps: number | null;
  terms: string | null;
  hold_days: number;
  user_id?: string | null;
}
export interface Order {
  id: string;
  partner_id?: string;
  reference: string;
  net_cents: number;
  refunded_cents: number;
  rate_bps: number;
  paid_at: string;
  product_summary?: string;
}
export interface Commission {
  id: string;
  partner_id: string;
  order_id: string;
  kind: "sale" | "refund";
  cents: number;
  available_at: string;
  approved: boolean;
  payout_id: string | null;
  created_at: string;
}
export interface Payout {
  id: string;
  partner_id?: string;
  amount_cents: number;
  created_at: string;
  reference?: string;
}
export interface RequestRecord {
  id: string;
  kind: string;
  name: string;
  email: string;
  product: string | null;
  lot: string | null;
  message: string;
  referral_code: string | null;
  created_at: string;
  email_status: string;
  status: string;
}
export interface Summary {
  partner: Partner;
  orders: Order[];
  commissions: Commission[];
  payouts: Payout[];
}
export function balances(entries: Commission[], now = Date.now()) {
  const unpaid = entries.filter((c) => !c.payout_id);
  const approved = unpaid
    .filter((c) => c.approved && Date.parse(c.available_at) <= now)
    .reduce((a, c) => a + c.cents, 0);
  const pending = unpaid
    .filter((c) => !c.approved || Date.parse(c.available_at) > now)
    .reduce((a, c) => a + c.cents, 0);
  const paid = entries.filter((c) => c.payout_id).reduce((a, c) => a + c.cents, 0);
  return { approved, pending, paid };
}
