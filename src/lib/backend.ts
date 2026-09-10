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
