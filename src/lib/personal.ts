/**
 * Small helpers that make the two signed-in dashboards feel like they know who
 * just walked in. Everything here is pure formatting — no data is invented, it
 * only phrases what the server already returned.
 */

/** "Good morning" / "Good afternoon" / "Good evening", on the reader's own clock. */
export function timeGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

/** "IT" from Isaac Triplett; "J" when only a first name is on file. */
export function initials(first?: string | null, last?: string | null): string {
  const a = (first ?? "").trim();
  const b = (last ?? "").trim();
  if (!a && !b) return "·";
  if (!b) {
    const parts = a.split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "");
  }
  return (a[0] ?? "") + (b[0] ?? "");
}

/** Whole days between a timestamp and now. Negative clamps to 0. */
export function daysSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

/**
 * How a person would say when you were last here: "earlier today",
 * "yesterday evening", "Thursday evening", or a plain date once it's been a
 * while. Deliberately vague about the minute — nobody cares that it was 9:14.
 */
export function lastVisitPhrase(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const partOfDay = (d: Date) => {
    const h = d.getHours();
    if (h < 5) return "overnight";
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  };
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayGap = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  const part = partOfDay(then);

  if (dayGap <= 0) return part === "overnight" ? "overnight" : `earlier this ${part}`;
  if (dayGap === 1) return part === "overnight" ? "overnight" : `yesterday ${part}`;
  if (dayGap < 7) {
    const weekday = then.toLocaleDateString(undefined, { weekday: "long" });
    return `${weekday} ${part}`;
  }
  if (dayGap < 365) return `on ${then.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
  return `on ${then.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;
}

/** "3 days" / "1 day" / "today" — for "you've been away N". */
export function awayPhrase(days: number | null): string | null {
  if (days == null || days <= 0) return null;
  if (days === 1) return "a day";
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

/**
 * A quiet line under the greeting that changes with the Arkansas calendar, so
 * the portal feels like the rest of the brand rather than an admin panel.
 */
export function seasonNote(now: Date = new Date()): string {
  return [
    "Deep winter in the Ouachitas.",
    "The first warm days are close.",
    "The dogwoods are about to turn.",
    "Spring in the Ouachitas.",
    "Long green days.",
    "Summer on the lake.",
    "High summer in Hot Springs.",
    "The last of the long heat.",
    "First cool mornings.",
    "The hills are turning.",
    "Woodsmoke weather.",
    "A quiet end to the year.",
  ][now.getMonth()]!;
}

/** Per-person monogram tint. Keys match nsp_user_roles.accent. */
export const ACCENTS: Record<string, { chip: string; ring: string }> = {
  forest: { chip: "bg-forest text-ivory", ring: "ring-forest/25" },
  gold: { chip: "bg-gold-ink text-ivory", ring: "ring-gold/35" },
  slate: { chip: "bg-primary text-primary-foreground", ring: "ring-primary/25" },
};
export const accentOf = (key?: string | null) => ACCENTS[key ?? ""] ?? ACCENTS["forest"]!;

/**
 * Every action name the audit log actually writes, mapped to a readable
 * predicate. Keep this in step with the `nsp_log(...)` calls in the migrations —
 * note that two of them build the name dynamically, as `ambassador_<status>`
 * and `commission_<status>`, so each status needs its own entry.
 */
const ACTION_PHRASES: Record<string, string> = {
  sale_recorded: "recorded a sale",
  sale_updated: "updated a sale",
  sale_status_changed: "changed a sale's status",
  sale_refunded: "recorded a refund",
  customer_created: "added a customer",
  customer_updated: "updated a customer",
  customers_merged: "merged two customers",
  customer_flagged: "flagged a duplicate",
  attribution_corrected: "corrected an attribution",
  ambassador_created: "added an ambassador",
  ambassador_updated: "updated an ambassador",
  ambassador_pending: "set an ambassador back to pending",
  ambassador_active: "activated an ambassador",
  ambassador_inactive: "made an ambassador inactive",
  ambassador_suspended: "suspended an ambassador",
  ambassador_archived: "archived an ambassador",
  ambassador_link_prepared: "prepared an ambassador's sign-in link",
  ambassador_access_prepared: "prepared an ambassador's access",
  application_approved: "approved an application",
  application_declined: "declined an application",
  commission_pending: "reopened a statement",
  commission_approved: "approved a statement",
  commission_held: "put a statement on hold",
  commission_paid: "marked a statement paid",
  commission_cancelled: "cancelled a statement",
  commission_adjusted: "adjusted a statement",
  request_status: "updated a request",
  settings_changed: "changed the program settings",
};

/** "Record sale" → "Record sale" as a heading-style label. */
export const actionTitle = (action: string) =>
  action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/**
 * Turns an audit action plus its actor into a sentence: "Daniel recorded a
 * sale". An action with no mapped phrase still reads cleanly — it falls back to
 * "Daniel · Added lot note" rather than an ungrammatical "Daniel added lot note".
 */
export function activitySentence(action: string, actorName?: string | null, isMe?: boolean): string {
  const who = isMe ? "You" : (actorName ?? "Someone");
  const phrase = ACTION_PHRASES[action];
  return phrase ? `${who} ${phrase}` : `${who} · ${actionTitle(action)}`;
}

/** Ambassador milestone copy. Keys match nsp_partner_milestones.key. */
export const MILESTONES: Record<string, { title: string; body: string }> = {
  first_click: {
    title: "Your link is live.",
    body: "Someone followed your referral link for the first time. It's working — keep sharing it.",
  },
  first_customer: {
    title: "Your first customer.",
    body: "Someone you sent found their way to us and ordered. That's the hardest one.",
  },
  five_customers: { title: "Five customers.", body: "Five people have come through your link. You're building something." },
  ten_customers: { title: "Ten customers.", body: "Double digits. Ten people trusted your recommendation." },
  twentyfive_customers: { title: "Twenty-five customers.", body: "Twenty-five people, all from your word. Rare air." },
  first_commission: { title: "You've earned your first commission.", body: "It's on your statement and it's yours." },
  earned_100: { title: "$100 earned.", body: "Your first hundred dollars in commission. Onward." },
  earned_500: { title: "$500 earned.", body: "Five hundred in commission, all from people who took your word for it." },
  earned_1000: { title: "$1,000 earned.", body: "A thousand dollars in commission. That is a real second income." },
  revenue_1000: { title: "$1,000 in referred sales.", body: "Your link has driven a thousand dollars of qualified revenue." },
  revenue_5000: { title: "$5,000 in referred sales.", body: "Five thousand dollars of qualified revenue through your code." },
  tier_1750: { title: "You reached 17.5%.", body: "Your rate stepped up this month. Every qualified sale earns more now." },
  tier_2000: { title: "You reached 20%.", body: "One in five dollars of qualified revenue comes back to you." },
  tier_2250: { title: "You reached 22.5%.", body: "Second-highest tier in the program. Very few get here." },
  tier_2500: { title: "You reached 25%.", body: "The top of the program. Nobody earns more than you do." },
};
