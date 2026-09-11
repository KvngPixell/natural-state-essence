import { useEffect, useState } from "react";
import { rpc, money, fmtDate, field, button, outline, errorText, todayISO } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import { referralUrl } from "@/components/owner/ambassadors";
import { Empty, Notice, Pill, Stat, TableWrap, td, th } from "@/components/program-ui";

interface AmbassadorRow {
  id: string;
  name: string;
  code: string;
  status: string;
  clicks: number;
  visitors: number;
  inquiries: number;
  new_customers: number;
  sales: number;
  revenue: number;
}
interface AnalyticsResult {
  from: string;
  to: string;
  clicks: number;
  visitors: number;
  inquiries: number;
  new_customers: number;
  sales: number;
  revenue_cents: number;
  ambassadors_with_sales: number;
  by_ambassador: AmbassadorRow[];
  by_day: { day: string; clicks: number }[];
  top_landing: { path: string; clicks: number }[];
}

type Preset = "today" | "week" | "month" | "last30" | "custom";
const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "last30", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

/** Date math on plain YYYY-MM-DD strings (program time zone is applied by todayISO). */
function shift(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}
function range(p: Preset): [string, string] {
  const today = todayISO();
  if (p === "today") return [today, today];
  if (p === "month") return [today.slice(0, 8) + "01", today];
  if (p === "last30") return [shift(today, -29), today];
  // week starts Monday
  const [y, m, d] = today.split("-").map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return [shift(today, -dow), today];
}
const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 + "%" : "—");

export function Analytics() {
  const { version, setFocus } = useOwner();
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState<[string, string]>(range("month"));
  const [from, to] = preset === "custom" ? custom : range(preset);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError("");
    rpc("nsp_referral_analytics", { p_from: from, p_to: to })
      .then((r) => setData(r as AnalyticsResult))
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, [from, to, version]);

  const maxDay = Math.max(1, ...(data?.by_day ?? []).map((d) => d.clicks));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button key={p.value} className={(preset === p.value ? button : outline) + " px-3 py-2"} onClick={() => setPreset(p.value)}>
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <span className="flex flex-wrap items-center gap-2">
            <input type="date" aria-label="From" className={field + " w-auto py-2"} value={custom[0]} max={custom[1]} onChange={(e) => setCustom([e.target.value, custom[1]])} />
            <span className="text-sm text-muted-foreground">to</span>
            <input type="date" aria-label="To" className={field + " w-auto py-2"} value={custom[1]} min={custom[0]} max={todayISO()} onChange={(e) => setCustom([custom[0], e.target.value])} />
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {fmtDate(from)} – {fmtDate(to)} · Central time. Visits are counted from ambassador links and codes only, using first-party storage — no ad trackers.
        {loading && " Updating…"}
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Referral clicks" value={data.clicks.toLocaleString()} sub={`${data.visitors.toLocaleString()} unique visitors`} />
            <Stat label="Referred inquiries" value={data.inquiries.toLocaleString()} sub={`${rate(data.inquiries, data.visitors)} of visitors`} />
            <Stat label="Referred sales" value={data.sales.toLocaleString()} sub={`${data.new_customers} new customer${data.new_customers === 1 ? "" : "s"}`} />
            <Stat label="Referred revenue" value={money(data.revenue_cents)} sub={`${data.ambassadors_with_sales} ambassador${data.ambassadors_with_sales === 1 ? "" : "s"} with sales`} emphasis />
          </div>

          <section className="grid gap-3">
            <h3 className="font-serif text-xl text-primary">Clicks by day</h3>
            {data.by_day.length === 0 ? (
              <Empty>No referral link visits in this range.</Empty>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
                <div className="flex h-40 min-w-fit items-end gap-1.5" role="img" aria-label="Referral clicks per day">
                  {data.by_day.map((d) => (
                    <div key={d.day} className="flex w-7 shrink-0 flex-col items-center gap-1" title={`${fmtDate(d.day)}: ${d.clicks}`}>
                      <span className="text-[0.62rem] text-muted-foreground">{d.clicks}</span>
                      <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(4, (d.clicks / maxDay) * 110)}px` }} />
                      <span className="text-[0.6rem] text-muted-foreground">{fmtDate(d.day, { month: "numeric", day: "numeric" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="font-serif text-xl text-primary">By ambassador</h3>
            {data.by_ambassador.length === 0 ? (
              <Empty>No ambassador activity in this range.</Empty>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th className={th}>Ambassador</th>
                    <th className={th + " text-right"}>Clicks</th>
                    <th className={th + " text-right"}>Visitors</th>
                    <th className={th + " text-right"}>Inquiries</th>
                    <th className={th + " text-right"}>Visitor → inquiry</th>
                    <th className={th + " text-right"}>New customers</th>
                    <th className={th + " text-right"}>Sales</th>
                    <th className={th + " text-right"}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_ambassador.map((a) => (
                    <tr key={a.id}>
                      <td className={td}>
                        <button className="text-left font-medium text-primary hover:underline" onClick={() => setFocus({ tab: "ambassadors", id: a.id })}>
                          {a.name}
                        </button>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          {referralUrl("/r/" + a.code).replace(/^https?:\/\//, "")} {a.status !== "active" && <Pill value={a.status} />}
                        </p>
                      </td>
                      <td className={td + " text-right tabular-nums"}>{a.clicks}</td>
                      <td className={td + " text-right tabular-nums"}>{a.visitors}</td>
                      <td className={td + " text-right tabular-nums"}>{a.inquiries}</td>
                      <td className={td + " text-right tabular-nums"}>{rate(a.inquiries, a.visitors)}</td>
                      <td className={td + " text-right tabular-nums"}>{a.new_customers}</td>
                      <td className={td + " text-right tabular-nums"}>{a.sales}</td>
                      <td className={td + " text-right font-medium tabular-nums"}>{money(a.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </section>

          {data.top_landing.length > 0 && (
            <section className="grid gap-3">
              <h3 className="font-serif text-xl text-primary">Top landing pages</h3>
              <ul className="grid gap-1.5 text-sm">
                {data.top_landing.map((l) => (
                  <li key={l.path} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <span className="min-w-0 truncate font-mono text-xs">{l.path}</span>
                    <span className="tabular-nums text-muted-foreground">{l.clicks}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
