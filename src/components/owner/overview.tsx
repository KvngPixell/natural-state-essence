import { useEffect, useState } from "react";
import { Plus, Search, UserPlus, Users } from "lucide-react";
import { rpc, money, fmtDate, fmtDateTime, fmtMonth, button, outline, panel, errorText } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import { Empty, Notice, Pill, Stat } from "@/components/program-ui";

interface OverviewData {
  month: string;
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
  flags: { self_purchase: number; disputed: number; duplicates: number; awaiting_payment: number };
  recent_sales: {
    id: string; public_id: string; paid_on: string | null; order_date: string; status: string;
    classification: string | null; qualified_cents: number; partner_name: string | null; customer_name: string;
  }[];
  recent_activity: { action: string; at: string; entity: string | null; reason: string | null }[];
}

export const actionLabel = (a: string) => a.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function Overview() {
  const { version, recordSale, go } = useOwner();
  const [d, setD] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    rpc("nsp_owner_overview")
      .then((r) => setD(r as OverviewData))
      .catch((e) => setError(errorText(e)));
  }, [version]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const flagCount = d.flags.self_purchase + d.flags.disputed + d.flags.duplicates;
  return (
    <div className="grid gap-6">
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

      {(d.order_requests > 0 || flagCount > 0 || d.flags.awaiting_payment > 0) && (
        <div className="grid gap-2">
          {d.order_requests > 0 && (
            <Notice tone="warn">
              {d.order_requests} order request{d.order_requests === 1 ? "" : "s"} waiting.{" "}
              <button className="underline" onClick={() => go("inquiries")}>Open inquiries</button>
            </Notice>
          )}
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
        <p className="mb-3 text-sm text-muted-foreground">{fmtMonth(d.month)}</p>
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
                    <p className="text-primary">{actionLabel(a.action)}</p>
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
