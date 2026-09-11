import { createClient } from "@supabase/supabase-js";
const url = import.meta.env["VITE_SUPABASE_URL"];
const key =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_ANON_KEY"];
export const backendReady = Boolean(url && key);
export const db = backendReady
  ? createClient(url, key, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: typeof window !== "undefined",
      },
    })
  : null;
export const publicSite =
  (import.meta.env["VITE_PUBLIC_SITE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export async function rpc(name: string, args: Record<string, unknown> = {}) {
  if (!db) throw new Error("Account service is not connected yet.");
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function edge(body: Record<string, unknown>) {
  if (!db) throw new Error("Request service is not connected yet.");
  const { data, error } = await db.functions.invoke("nsp-portal", { body });
  if (error) {
    if (error.context instanceof Response) {
      const result = await error.context.json().catch(() => ({}));
      throw new Error(result.error ?? "Request could not be completed.");
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export const field =
  "w-full min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
export const button =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";
export const outline =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-primary/20 px-5 py-3 text-sm text-primary hover:bg-secondary disabled:opacity-50";
export const panel = "rounded-2xl border border-border bg-card p-6 shadow-soft";

/** "$1,234.56" or "1234.5" → cents. Returns null when not a valid amount. */
export function toCents(input: string): number | null {
  const s = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(/\.00$/, "");
export const pct = (bps: number | null | undefined) =>
  bps == null ? "—" : (bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "%";
/** Dates from the database are plain YYYY-MM-DD; format without timezone drift. */
export function fmtDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  if (!y || !m || !day) return "—";
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}
export const fmtMonth = (d: string | null | undefined) => fmtDate(d, { month: "long", year: "numeric" });
export function fmtDateTime(ts: string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago",
  });
}
/** Today in the program time zone as YYYY-MM-DD. */
export function todayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return parts;
}
export function errorText(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong. Please try again.";
}
export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "cashapp", label: "Cash App" },
  { value: "venmo", label: "Venmo" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
] as const;
export const paymentLabel = (v: string | null | undefined) =>
  PAYMENT_METHODS.find((p) => p.value === v)?.label ?? "—";
