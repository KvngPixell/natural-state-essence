import { createContext, useContext } from "react";
import type { SalePrefill } from "@/components/owner/record-sale";

export const OWNER_TABS = [
  "overview",
  "inquiries",
  "customers",
  "orders",
  "ambassadors",
  "applications",
  "commissions",
  "payouts",
  "analytics",
  "settings",
  "audit",
] as const;
export type OwnerTab = (typeof OWNER_TABS)[number];
export const LABELS: Record<OwnerTab, string> = {
  overview: "Overview",
  inquiries: "Inquiries",
  customers: "Customers",
  orders: "Orders / Sales",
  ambassadors: "Ambassadors",
  applications: "Applications",
  commissions: "Commissions",
  payouts: "Payouts",
  analytics: "Referral Analytics",
  settings: "Program Settings",
  audit: "Audit Log",
};

export interface OwnerCtx {
  /** Opens the Record Sale sheet, optionally pre-filled. */
  recordSale: (prefill?: SalePrefill) => void;
  /** Bumped after any change so every panel refetches. */
  version: number;
  refresh: () => void;
  go: (tab: OwnerTab) => void;
  /** Deep link into a record on another tab (customer id, ambassador id…). */
  focus: { tab: OwnerTab; id: string } | null;
  setFocus: (f: { tab: OwnerTab; id: string } | null) => void;
}
export const OwnerContext = createContext<OwnerCtx | null>(null);
export function useOwner() {
  const c = useContext(OwnerContext);
  if (!c) throw new Error("useOwner outside ControlCenter");
  return c;
}

