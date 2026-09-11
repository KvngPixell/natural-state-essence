import { edge, backendReady } from "@/lib/backend";

/**
 * First-party referral attribution.
 *
 * The browser only remembers *which code* brought a visitor and a random
 * visitor id. It never decides who gets paid: the server re-validates the
 * code, checks the ambassador is active, and the commission engine protects
 * any existing customer attribution. Clearing this storage cannot move an
 * existing customer to a different ambassador.
 */
const REF_KEY = "nsp_ref";
const VISITOR_KEY = "nsp_vid";
// How long a captured referral is attached to this browser's inquiries. The
// server applies the same window (Program Settings → referral window) to
// click-based attribution.
const REF_DAYS = 30;

export interface StoredReferral {
  code: string;
  at: number;
}

function safeGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode); attribution still works via clicks */
  }
}

export function visitorId(): string {
  if (typeof window === "undefined") return "";
  let v = safeGet(VISITOR_KEY);
  if (!v || !/^[A-Za-z0-9-]{8,64}$/.test(v)) {
    v = crypto.randomUUID();
    safeSet(VISITOR_KEY, v);
  }
  return v;
}

export function storedReferral(): StoredReferral | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = safeGet(REF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (!parsed.code || !/^[A-Z0-9_-]{3,32}$/.test(parsed.code)) return null;
    if (Date.now() - parsed.at > REF_DAYS * 86400000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

/**
 * Record a referral visit (server validates + logs the click) and remember
 * the canonical code locally. Returns the canonical code, or null when the
 * code is not an active ambassador's.
 */
export async function captureReferral(code: string, source: "link" | "param"): Promise<string | null> {
  const c = normalizeCode(code);
  if (!/^[A-Z0-9_-]{3,32}$/.test(c) || !backendReady) return null;
  try {
    const result = (await edge({
      action: "track",
      code: c,
      visitor_id: visitorId(),
      landing: window.location.pathname,
      referrer: document.referrer || null,
      source,
    })) as { valid?: boolean; code?: string };
    if (!result?.valid) return null;
    const canonical = result.code ?? c;
    safeSet(REF_KEY, JSON.stringify({ code: canonical, at: Date.now() } satisfies StoredReferral));
    return canonical;
  } catch {
    return null;
  }
}

export async function checkCode(code: string): Promise<boolean> {
  const c = normalizeCode(code);
  if (!/^[A-Z0-9_-]{3,32}$/.test(c) || !backendReady) return false;
  try {
    const result = (await edge({ action: "check_code", code: c })) as { valid?: boolean };
    return Boolean(result?.valid);
  } catch {
    return false;
  }
}
