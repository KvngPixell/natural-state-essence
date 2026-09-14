import { useEffect, useState } from "react";
import { ArrowRight, Plus, Search, UserPlus, Users } from "lucide-react";
import { rpc, money, fmtDate, fmtDateTime, fmtMonth, button, outline, panel, errorText } from "@/lib/backend";
import { useOwner, type OwnerTab } from "@/components/owner/owner-context";
import { Empty, Notice, Pill, Stat } from "@/components/program-ui";
import { Digest, type DigestItem } from "@/components/personal";
import { activitySentence, lastVisitPhrase } from "@/lib/personal";

interface OverviewData {
  month: string;
  today: string;
  me: { first_name: string | null; last_name: string | null; accent: string | null } | null;
  sales_count: number;
  sales_cents: number;
  ambassador_revenue_cents: number;
  commission_this_month_cents: number;
  commission_owed_cents: number;
  unpaid_approved_cents: number;
  active_ambassadors: number;
  pending_applications: number;
  pending_inquiries: number;
  order_requests: number;
  new_customers: number;
  returning_customers: number;
  top_ambassador: { name: string; qualified_cents: number; tier_name: string } | null;
  scoreboard: {
    this_month_cents: number;
    last_month_cents: number;
    best_month: string | null;
    best_month_cents: number;
    record_month: boolean;
    last_sale_on: string | null;
    days_since_last_sale: number | null;
    streak_days: number;
  };
  oldest_open_request: { id: string; kind: string; created_at: string; name: string | null } | null;
  flags: { self_purchase: number; disputed: number; duplicates: number; awaiting_payment: number };
  recent_sales: {
    id: string; public_id: string; paid_on: string | null; order_date: string; status: string;
    classification: string | null; qualified_cents: number; partner_name: string | null; customer_name: string;
  }[];
  recent_activity: {
    action: string; at: string; entity: string | null; reason: string | null;
    actor_name: string | null; is_me: boolean;
  }[];
}

interface OwnerDigest {
  first_visit: boolean;
  since: string | null;
  order_requests?: number;
  applications?: number;
  inquiries?: number;
  sales_count?: number;
  sales_cents?: number;
  new_customers?: number;
  clicks?: number;
  partner_events?: { action: string; at: string; entity: string | null; actor_name: string | null }[];
}

export const actionLabel = (a: string) => a.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function Overview() {
  const { version, recordSale, go } = useOwner();
  const [d, setD] = useState<OverviewData | null>(null);
  const [digest, setDigest] = useState<OwnerDigest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    rpc("nsp_owner_overview")
      .then((r) => setD(r as OverviewData))
      .catch((e) => setError(errorText(e)));
  }, [version]);

  // Fetched once per mount on purpose: the digest describes the moment you
  // arrived, so it must not shift under you every time something is saved.
  useEffect(() => {
    rpc("nsp_owner_digest")
      .then((r) => setDigest(r as OwnerDigest))
      .catch(() => setDigest(null));
  }, []);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const flagCount = d.flags.self_purchase + d.flags.disputed + d.flags.duplicates;
  const digestItems: DigestItem[] = digest
    ? [
        { n: digest.order_requests ?? 0, one: "order request", many: "order requests" },
        { n: digest.applications ?? 0, one: "application", many: "applications" },
        { n: digest.inquiries ?? 0, one: "inquiry", many: "inquiries" },
        {
          n: digest.sales_count ?? 0,
          one: "sale recorded",
          many: "sales recorded",
        },
        { n: digest.new_customers ?? 0, one: "new customer", many: "new customers" },
        { n: digest.clicks ?? 0, one: "referral click", many: "referral clicks" },
      ]
    : [];

  return (
    <div className="grid gap-6">
      <Digest
        since={digest && !digest.first_visit ? lastVisitPhrase(digest.since) : null}
        items={digestItems}
        footer={
          digest?.partner_events?.length ? (
            <>
              <p className="text-primary">While you were away</p>
              <ul className="mt-1.5 grid gap-1">
                {digest.partner_events.slice(0, 4).map((e, i) => (
                  <li key={i}>
                    {activitySentence(e.action, e.actor_name, false)}
                    <span className="mx-2 text-border">·</span>
                    <span className="text-xs">{fmtDateTime(e.at)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : undefined
        }
      />

      <NextMove data={d} flagCount={flagCount} go={go} recordSale={recordSale} />

      <div className="flex flex-wrap gap-2">
        <button className={button} onClick={() => recordSale()}>
          <Plus className="size-4" /> Record sale
        </button>
        <button className={outline} onClick={() => go("customers")}>
          <Users className="size-4" /> Add or find customer
        </button>
        <button className={outline} onClick={() => go("ambassadors")}>
          <UserPlus className="size-4" /> Add ambassador
        </button>
        <button className={outline} onClick={() => go("applications")}>
          Review applications{d.pending_applications ? ` (${d.pending_applications})` : ""}
        </button>
        <button className={outline} onClick={() => go("inquiries")}>
          <Search className="size-4" /> Inquiries{d.pending_inquiries ? ` (${d.pending_inquiries})` : ""}
        </button>
        <button className={outline} onClick={() => go("commissions")}>
          Review commissions
        </button>
      </div>

      {(d.flags.awaiting_payment > 0 || flagCount > 0) && (
        <div className="grid gap-2">
          {d.flags.awaiting_payment > 0 && (
            <Notice tone="info">
              {d.flags.awaiting_payment} sale{d.flags.awaiting_payment === 1 ? "" : "s"} awaiting payment.{" "}
              <button className="underline" onClick={() => go("orders")}>Open sales</button>
            </Notice>
          )}
          {flagCount > 0 && (
            <Notice tone="warn">
              Needs a look: {d.flags.self_purchase ? `${d.flags.self_purchase} ambassador self-purchase · ` : ""}
              {d.flags.disputed ? `${d.flags.disputed} disputed · ` : ""}
              {d.flags.duplicates ? `${d.flags.duplicates} possible duplicate customer${d.flags.duplicates === 1 ? "" : "s"}` : ""}
            </Notice>
          )}
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm text-muted-foreground">{fmtMonth(d.month)}</p>
          <Scoreboard s={d.scoreboard} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Stat label="Sales this month" value={money(d.sales_cents)} sub={`${d.sales_count} confirmed`} emphasis />
          <Stat label="Qualified ambassador revenue" value={money(d.ambassador_revenue_cents)} />
          <Stat label="Estimated commission" value={money(d.commission_this_month_cents)} sub="this month" />
          <Stat label="Commission owed" value={money(d.commission_owed_cents)} sub={`${money(d.unpaid_approved_cents)} approved, unpaid`} />
          <Stat label="Active ambassadors" value={d.active_ambassadors} />
          <Stat label="New customers" value={d.new_customers} sub="first purchase this month" />
          <Stat label="Returning customers" value={d.returning_customers} sub="bought again this month" />
          <Stat label="Pending applications" value={d.pending_applications} />
          <Stat label="New inquiries" value={d.pending_inquiries} />
          <Stat
            label="Top ambassador"
            value={d.top_ambassador ? d.top_ambassador.name : "—"}
            sub={d.top_ambassador ? `${money(d.top_ambassador.qualified_cents)} · ${d.top_ambassador.tier_name}` : "no qualified sales yet"}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className={panel}>
          <h2 className="font-serif text-2xl text-primary">Recent sales</h2>
          <div className="mt-4">
            {d.recent_sales.length === 0 ? (
              <Empty>No sales recorded yet. Use Record sale after a customer pays.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {d.recent_sales.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary">{s.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(s.paid_on ?? s.order_date)} · {s.public_id}
                        {s.partner_name ? ` · ${s.partner_name}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill value={s.classification ?? s.status} label={s.classification ?? undefined} />
                      <span className="tabular-nums">{money(s.qualified_cents)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className={panel}>
          <h2 className="font-serif text-2xl text-primary">Recent activity</h2>
          <div className="mt-4">
            {d.recent_activity.length === 0 ? (
              <Empty>Nothing yet.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {d.recent_activity.map((a, i) => (
                  <li key={i} className="py-2.5 text-sm">
                    <p className="text-primary">
                      {a.actor_name ? activitySentence(a.action, a.actor_name, a.is_me) : actionLabel(a.action)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(a.at)}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One prioritized card: the single thing most worth doing right now. Six equal
 * buttons make you decide; this decides for you and stays out of the way once
 * there is nothing waiting.
 */
function NextMove({
  data: d,
  flagCount,
  go,
  recordSale,
}: {
  data: OverviewData;
  flagCount: number;
  go: (t: OwnerTab) => void;
  recordSale: () => void;
}) {
  const oldest = d.oldest_open_request;
  const waited = oldest ? waitingFor(oldest.created_at) : null;
  const who = oldest?.name ? oldest.name : null;

  let title: string;
  let detail: string;
  let label: string;
  let action: () => void;

  if (d.order_requests > 0) {
    title = who && oldest?.kind === "order" ? `Answer ${who}'s order request.` : "Answer the waiting order requests.";
    detail =
      (d.order_requests === 1 ? "One order request is" : `${d.order_requests} order requests are`) +
      " waiting on you" +
      (waited && oldest?.kind === "order" ? `, the oldest for ${waited}` : "") +
      ".";
    label = "Open inquiries";
    action = () => go("inquiries");
  } else if (d.flags.awaiting_payment > 0) {
    title = "Some sales are still awaiting payment.";
    detail = `${d.flags.awaiting_payment} sale${d.flags.awaiting_payment === 1 ? "" : "s"} recorded but not yet marked paid.`;
    label = "Open sales";
    action = () => go("orders");
  } else if (d.pending_applications > 0) {
    title = who && oldest?.kind === "application" ? `Review ${who}'s application.` : "Review the waiting applications.";
    detail =
      (d.pending_applications === 1 ? "One ambassador application is" : `${d.pending_applications} applications are`) +
      " waiting" +
      (waited && oldest?.kind === "application" ? `, the oldest for ${waited}` : "") +
      ".";
    label = "Open applications";
    action = () => go("applications");
  } else if (d.pending_inquiries > 0) {
    title = who ? `Reply to ${who}.` : "Reply to the new inquiries.";
    detail = `${d.pending_inquiries} inquir${d.pending_inquiries === 1 ? "y is" : "ies are"} unanswered${waited ? `, the oldest for ${waited}` : ""}.`;
    label = "Open inquiries";
    action = () => go("inquiries");
  } else if (d.unpaid_approved_cents > 0) {
    title = `Pay out ${money(d.unpaid_approved_cents)}.`;
    detail = "Approved commission is sitting unpaid. Send it and record the payout.";
    label = "Open payouts";
    action = () => go("payouts");
  } else if (flagCount > 0) {
    title = "A few records need a look.";
    detail = "Self-purchases, disputes or possible duplicate customers are flagged.";
    label = "Open sales";
    action = () => go("orders");
  } else {
    title = "Nothing's waiting on you.";
    detail = "The inbox is clear. Record a sale when the next one comes in.";
    label = "Record sale";
    action = () => recordSale();
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-soft sm:p-6">
      <p className="eyebrow">Your move</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl text-primary sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
        </div>
        <button className={button} onClick={action}>
          {label} <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Milestone-flavoured framing for the month, rather than another bare number. */
function Scoreboard({ s }: { s: OverviewData["scoreboard"] }) {
  const notes: string[] = [];
  if (s.record_month && s.best_month) {
    notes.push(`Best month yet — past ${fmtMonth(s.best_month)}'s ${money(s.best_month_cents)}.`);
  } else if (s.last_month_cents > 0 && s.this_month_cents >= s.last_month_cents) {
    notes.push(`Already ahead of last month's ${money(s.last_month_cents)}.`);
  } else if (s.last_month_cents > 0) {
    notes.push(`${money(s.last_month_cents - s.this_month_cents)} to match last month.`);
  }
  if (s.streak_days >= 2) notes.push(`${s.streak_days} days running with a sale.`);
  else if (s.days_since_last_sale != null && s.days_since_last_sale >= 7)
    notes.push(`${s.days_since_last_sale} days since the last sale.`);

  if (notes.length === 0) return null;
  return <p className="text-sm text-accent">{notes.join(" ")}</p>;
}

/** "3 days" / "2 hours" — how long the oldest thing has been sitting. */
function waitingFor(iso: string): string | null {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "under an hour";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}
