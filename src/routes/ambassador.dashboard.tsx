import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Share2 } from "lucide-react";
import { usePortal } from "@/components/portal-context";
import { db, rpc, money, pct, fmtDate, fmtMonth, button, outline, panel, publicSite, errorText } from "@/lib/backend";
import type { AmbassadorDashboard } from "@/lib/program-types";
import { Empty, Notice, Pill, Progress, Stat, TableWrap, td, th } from "@/components/program-ui";

export const Route = createFileRoute("/ambassador/dashboard")({
  head: () => ({
    meta: [
      { title: "Ambassador Dashboard — Natural State Peptides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, role } = usePortal();
  const navigate = useNavigate();
  const [data, setData] = useState<AmbassadorDashboard | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) return void navigate({ to: "/ambassador/login" });
    if (role === "owner" || role === "admin") return void navigate({ to: "/owner" });
    setBusy(true);
    rpc("nsp_ambassador_dashboard", { p_month: month })
      .then((d) => {
        setData(d as AmbassadorDashboard);
        setError("");
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setBusy(false));
  }, [loading, user, role, month, navigate]);

  if (loading || (busy && !data && !error)) return <p className="p-12 text-center">Loading your dashboard…</p>;
  if (error && !data)
    return (
      <section className="mx-auto max-w-lg px-5 py-20">
        <h1 className="font-serif text-4xl text-primary">Ambassador access</h1>
        <p className="my-5 text-muted-foreground">
          {error.includes("Approved ambassador")
            ? "This account isn't linked to an approved ambassador yet. If you've applied, we'll be in touch once your application is reviewed."
            : error}
        </p>
        <button className={outline} onClick={() => db?.auth.signOut()}>
          Sign out
        </button>
      </section>
    );
  if (!data) return null;
  return <DashboardView data={data} month={month} setMonth={setMonth} busy={busy} />;
}

function DashboardView({
  data,
  month,
  setMonth,
  busy,
}: {
  data: AmbassadorDashboard;
  month: string | null;
  setMonth: (m: string | null) => void;
  busy: boolean;
}) {
  const { rank } = data;
  const active = data.profile.status === "active";
  const months = useMemo(() => {
    const set = new Set<string>([data.month, ...data.statements.map((s) => s.month)]);
    return [...set].sort().reverse();
  }, [data.month, data.statements]);
  const conversion = data.visitors > 0 ? Math.round((data.new_customers / data.visitors) * 1000) / 10 : null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Natural State Ambassadors</p>
          <h1 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">Welcome, {data.profile.first_name}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ambassador {data.profile.public_id} · Code <span className="font-medium text-primary">{data.profile.code}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            <span className="sr-only">Month</span>
            <select
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              value={month ?? data.month}
              onChange={(e) => setMonth(e.target.value === months[0] ? null : e.target.value)}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {fmtMonth(m)}
                </option>
              ))}
            </select>
          </label>
          <button className={outline} onClick={() => db?.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>

      {!active && (
        <div className="mt-6">
          <Notice tone="warn">
            Your ambassador account is currently <strong>{data.profile.status}</strong>. Your referral link is
            paused and new referrals won't be attributed until it's reactivated. Your history remains below.
          </Notice>
        </div>
      )}

      {/* Rank hero */}
      <div className={"mt-8 overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-soft sm:p-8 " + (busy ? "opacity-70" : "")}>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div className="min-w-0">
            <p className="text-[0.68rem] tracking-[0.22em] text-primary-foreground/70 uppercase">
              Monthly qualified revenue · {fmtMonth(data.month)}
            </p>
            <p className="mt-2 font-serif text-5xl sm:text-6xl">{money(data.qualified_cents)}</p>
            <p className="mt-4 text-[0.7rem] tracking-[0.2em] text-gold uppercase">{rank.name}</p>
            <p className="mt-1 text-lg">{pct(rank.bps)} new customer commission</p>
          </div>
          <div className="min-w-0">
            {rank.next_name && rank.next_min_cents != null ? (
              <>
                <p className="text-sm text-primary-foreground/85">
                  <strong className="text-primary-foreground">{money(Math.max(0, rank.to_next_cents ?? 0))}</strong> until{" "}
                  {rank.next_name}
                </p>
                <Progress
                  className="mt-3"
                  value={data.qualified_cents - rank.min_cents}
                  max={rank.next_min_cents - rank.min_cents}
                />
              </>
            ) : (
              <p className="text-sm text-primary-foreground/85">Top rank reached this month.</p>
            )}
            <ol className="mt-5 flex flex-wrap gap-1.5" aria-label="Ranks">
              {data.tiers.map((t) => (
                <li
                  key={t.name}
                  className={
                    "rounded-full px-2.5 py-1 text-[0.66rem] tracking-wide " +
                    (t.name === rank.name ? "bg-gold text-primary" : "bg-primary-foreground/10 text-primary-foreground/75")
                  }
                  title={`${money(t.min_cents)}+ · ${pct(t.bps)}`}
                >
                  {t.name}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Stat label="Total estimated commission" value={money(data.total_commission_cents)} emphasis
          sub={data.adjustment_cents ? `includes ${money(data.adjustment_cents)} adjustment` : `status: ${data.statement_status}`} />
        <Stat label="New customer commission" value={money(data.new_commission_cents)} sub={`${pct(rank.bps)} of ${money(data.new_revenue_cents)}`} />
        <Stat label="Residual commission" value={money(data.residual_commission_cents)} sub={`${pct(data.residual_bps)} of ${money(data.residual_revenue_cents)}`} />
        <Stat label="Current rank" value={rank.name} sub={`${pct(rank.bps)} new customer rate`} />
        <Stat label="New customer revenue" value={money(data.new_revenue_cents)} />
        <Stat label="Returning customer revenue" value={money(data.residual_revenue_cents)} sub="counts 100% toward rank" />
        <Stat label="New customers" value={data.new_customers} sub="this month" />
        <Stat label="Returning customers" value={data.returning_customers} sub="this month" />
        <Stat label="Referral clicks" value={data.clicks} sub={`${data.visitors} unique visitors`} />
        <Stat label="Inquiry conversions" value={`${data.inquiry_conversions} / ${data.inquiries}`} sub="inquiries that became sales" />
        <Stat label="Conversion rate" value={conversion == null ? "—" : conversion + "%"} sub="new customers ÷ visitors" />
        <Stat label="Lifetime qualifying revenue" value={money(data.lifetime_revenue_cents)} />
        <Stat label="Lifetime commission" value={money(data.lifetime_commission_cents)} sub={`${money(data.paid_to_date_cents)} paid to date`} />
      </div>

      <ReferralTools code={data.profile.code} path={data.profile.referral_path} active={active} />

      {/* Recent sales */}
      <div className={panel + " mt-8"}>
        <h2 className="font-serif text-3xl text-primary">Recent sales</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New customers earn your monthly rank rate. Returning customers earn {pct(data.residual_bps)} for{" "}
          {data.residual_months} months after their first purchase.
        </p>
        <div className="mt-5">
          {data.recent_sales.length === 0 ? (
            <Empty>No recorded sales yet. Sales appear here once Natural State confirms payment.</Empty>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Sale type</th>
                  <th className={th + " text-right"}>Qualified</th>
                  <th className={th + " text-right"}>Rate</th>
                  <th className={th + " text-right"}>Est. commission</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_sales.map((s, i) => (
                  <tr key={i}>
                    <td className={td + " whitespace-nowrap"}>{fmtDate(s.date)}</td>
                    <td className={td}>{s.customer}</td>
                    <td className={td}>
                      <Pill value={s.type} label={s.type === "RESIDUAL" ? "RESIDUAL" : s.type ?? undefined} />
                    </td>
                    <td className={td + " text-right tabular-nums"}>{money(s.qualified_cents)}</td>
                    <td className={td + " text-right tabular-nums"}>{s.rate_bps ? pct(s.rate_bps) : "—"}</td>
                    <td className={td + " text-right tabular-nums"}>{money(s.commission_cents)}</td>
                    <td className={td}>
                      <Pill value={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </div>

      {/* Customer book */}
      <div className={panel + " mt-8"}>
        <h2 className="font-serif text-3xl text-primary">My customers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customers attributed to you. Returning purchases earn residual commission until the expiry date.
        </p>
        <div className="mt-5">
          {data.customers.length === 0 ? (
            <Empty>Customers appear here after their first confirmed purchase through your referral.</Empty>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Since</th>
                  <th className={th + " text-right"}>Orders</th>
                  <th className={th + " text-right"}>Revenue</th>
                  <th className={th}>Last purchase</th>
                  <th className={th}>Residual</th>
                  <th className={th}>Expires</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c, i) => (
                  <tr key={i}>
                    <td className={td + " font-medium text-primary"}>{c.label}</td>
                    <td className={td + " whitespace-nowrap"}>{fmtDate(c.since)}</td>
                    <td className={td + " text-right tabular-nums"}>{c.orders}</td>
                    <td className={td + " text-right tabular-nums"}>{money(c.revenue_cents)}</td>
                    <td className={td + " whitespace-nowrap"}>{fmtDate(c.last_purchase_on)}</td>
                    <td className={td}>
                      <Pill value={c.status} />
                    </td>
                    <td className={td + " whitespace-nowrap"}>{fmtDate(c.residual_expires_on)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Statements */}
        <div className={panel}>
          <h2 className="font-serif text-3xl text-primary">Monthly commission</h2>
          <div className="mt-5">
            {data.statements.length === 0 ? (
              <Empty>Your first statement appears with your first recorded sale.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {data.statements.map((s) => (
                  <li key={s.month} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-primary">{fmtMonth(s.month)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.tier_name ?? "—"} · {money(s.qualified_cents)} qualified
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums">{money(s.final_cents)}</p>
                      <Pill value={s.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* Payouts */}
        <div className={panel}>
          <h2 className="font-serif text-3xl text-primary">Payout history</h2>
          <div className="mt-5">
            {data.payouts.length === 0 ? (
              <Empty>No payouts recorded yet. Approved commission is paid after each month closes.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {data.payouts.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-primary">{money(p.amount_cents)}</p>
                      <p className="text-xs text-muted-foreground">for {fmtMonth(p.month)}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{fmtDate(p.paid_on)}</p>
                      {p.reference && <p>Ref {p.reference}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {data.leaderboard && data.leaderboard.length > 0 && (
        <div className={panel + " mt-8"}>
          <h2 className="font-serif text-3xl text-primary">Top Natural State Ambassadors</h2>
          <p className="mt-1 text-sm text-muted-foreground">{fmtMonth(data.month)} · by monthly qualified revenue</p>
          <ol className="mt-5 divide-y divide-border">
            {data.leaderboard.map((l) => (
              <li key={l.position} className={"flex items-center gap-4 py-3 text-sm " + (l.is_me ? "font-medium text-primary" : "")}>
                <span className="w-6 text-right font-serif text-xl text-gold-ink">{l.position}</span>
                <span className="min-w-0 flex-1 truncate">
                  {l.label}
                  {l.is_me ? " (you)" : ""}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{l.tier_name}</span>
                <span className="tabular-nums">{money(l.qualified_cents)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className={panel + " mt-8"}>
        <h2 className="font-serif text-3xl text-primary">Represent the brand responsibly</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Share the catalog and your link. No human-use guidance, dosing, treatment promises or testing
          claims we haven't documented. Disclose that you earn a commission near any endorsement.
          Commission is paid only on confirmed, paid sales — never on clicks alone.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="/ambassador-assets/copy-guide.txt" download className={button}>
            Download ambassador copy guide
          </a>
          <Link to="/terms" className={outline}>
            Program terms
          </Link>
        </div>
      </div>
    </section>
  );
}

function ReferralTools({ code, path, active }: { code: string; path: string; active: boolean }) {
  const origin = typeof window === "undefined" ? publicSite : publicSite || window.location.origin;
  const link = origin + path;
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, { width: 640, margin: 2, color: { dark: "#123526", light: "#ffffff" } })
      .then((d: string) => alive && setQr(d))
      .catch(() => alive && setStatus("QR code could not be generated."));
    return () => {
      alive = false;
    };
  }, [link]);
  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${what} copied.`);
    } catch {
      setStatus("Select and copy it from the box above.");
    }
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Natural State Peptides", url: link });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copy(link, "Link");
  }
  return (
    <div className={panel + " mt-8"}>
      <p className="eyebrow">Your referral tools</p>
      <div className="mt-4 grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <label className="grid gap-2 text-sm">
            Personal referral link
            <input
              readOnly
              aria-label="Your referral link"
              className="w-full min-w-0 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-base"
              value={link}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <p className="mt-4 text-sm">
            Referral code: <span className="font-serif text-2xl text-primary">{code}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            People who visit through your link are recognized automatically. Anyone you meet in person can
            enter your code on any inquiry or order form instead.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className={button} onClick={() => copy(link, "Link")} disabled={!active}>
              <Copy className="size-4" /> Copy link
            </button>
            <button className={outline} onClick={share} disabled={!active}>
              <Share2 className="size-4" /> Share link
            </button>
            {qr && (
              <a href={qr} download={`natural-state-${code}.png`} className={outline}>
                <Download className="size-4" /> Download QR code
              </a>
            )}
          </div>
          <p role="status" className="mt-3 text-sm text-primary">
            {status}
          </p>
        </div>
        {qr && (
          <img src={qr} alt={`QR code for ${link}`} width={176} height={176} className="mx-auto rounded-lg border border-border bg-white p-2" />
        )}
      </div>
    </div>
  );
}
