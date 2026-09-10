import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { usePortal } from "@/components/portal-context";
import { db, rpc, money, panel, button, outline, publicSite } from "@/lib/backend";
import { balances, type Summary } from "@/lib/portal-types";
export const Route = createFileRoute("/partner/dashboard")({
  head: () => ({
    meta: [
      { title: "Partner Dashboard — Natural State Peptides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});
function Dashboard() {
  const { user, loading, admin } = usePortal();
  const [data, setData] = useState<Summary | null>(null);
  const [status, setStatus] = useState("");
  const [days, setDays] = useState(30);
  const [qr, setQr] = useState("");
  const [tab, setTab] = useState("overview");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(null);
    if (user && !loading) {
      void rpc("nsp_partner_summary")
        .then((d) => {
          if (alive) {
            setData(d);
            setStatus("");
          }
        })
        .catch((e) => {
          if (alive) setStatus(e.message);
        });
    }
    return () => {
      alive = false;
    };
  }, [user?.id, loading, revision]);
  if (loading) return <div className="p-12 text-center">Loading account…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-lg px-5 py-20">
        <h1 className="font-serif text-4xl">Your partner account</h1>
        <p className="my-5">Sign in to see your sales and commissions.</p>
        <Link to="/partner/login" className={button}>
          Sign in
        </Link>
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        <h1 className="font-serif text-4xl">{admin ? "Owner account" : "Partner access"}</h1>
        <p className="my-5" role="status">
          {admin
            ? "Open owner controls to manage partners and recorded sales."
            : status || "Loading your records…"}
        </p>
        {admin && (
          <Link to="/admin/partners" className={button}>
            Open owner controls
          </Link>
        )}
        <button className={outline + " ml-3"} onClick={() => db?.auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  const { partner, orders, commissions, payouts } = data;
  const totals = balances(commissions);
  const visible = orders.filter(
    (o) => days === 0 || Date.parse(o.paid_at) >= Date.now() - days * 86400000,
  );
  const revenue = visible.reduce((a, o) => a + o.net_cents - o.refunded_cents, 0);
  const link =
    publicSite && /^https:\/\/[^/?#]+$/.test(publicSite)
      ? publicSite + "/catalog?ref=" + encodeURIComponent(partner.code)
      : "";
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Referral link copied.");
    } catch {
      setStatus("Select and copy your link below.");
    }
  }
  async function makeQr() {
    try {
      setQr(
        await QRCode.toDataURL(link, {
          width: 512,
          margin: 2,
          color: { dark: "#123526", light: "#ffffff" },
        }),
      );
    } catch {
      setStatus("QR could not be generated.");
    }
  }
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Natural State Partners</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Welcome, {partner.name}.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your recorded sales, referrals and commission history.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={outline} onClick={() => setRevision((v) => v + 1)}>
            Refresh sales
          </button>
          {admin && (
            <Link to="/admin/partners" className={outline}>
              Owner controls
            </Link>
          )}
          <button className={outline} onClick={() => db?.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
      <div
        className="my-8 flex flex-wrap gap-3 border-b border-border pb-4"
        aria-label="Dashboard sections"
      >
        {["overview", "sales", "payouts", "assets"].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={tab === t ? button : outline}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <p role="status" className="mb-4 text-sm">
        {status}
      </p>
      {(tab === "overview" || tab === "sales") && (
        <>
          <label className="mb-5 flex items-center gap-3 text-sm">
            Sales period
            <select
              className="rounded border border-border bg-card p-2"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={0}>All time</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Recorded net sales", money(revenue)],
              ["Paid orders", String(visible.length)],
              ["Pending commission", money(totals.pending)],
              ["Approved unpaid", money(totals.approved)],
            ].map(([label, value]) => (
              <div key={label} className={panel}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-4 font-serif text-4xl text-primary">{value}</p>
              </div>
            ))}
          </div>
          <p className="my-4 text-xs text-muted-foreground">
            Sales follow the selected period; commission balances are all time. Refunds reduce sales
            and commission. Orders are recorded after payment confirmation.
          </p>
        </>
      )}
      {tab === "overview" && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className={panel}>
            <p className="eyebrow">Your referral</p>
            <h2 className="mt-3 font-serif text-3xl">{partner.code}</h2>
            {link ? (
              <>
                <input
                  aria-label="Your referral link"
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                  className="my-4 w-full rounded border border-border bg-background p-3 text-sm"
                />
                <div className="flex flex-wrap gap-3">
                  <button className={button} onClick={copy}>
                    Copy link
                  </button>
                  <button className={outline} onClick={makeQr}>
                    Generate QR
                  </button>
                </div>
                {qr && (
                  <a
                    href={qr}
                    download={"natural-state-" + partner.code + ".png"}
                    className="mt-5 inline-block"
                  >
                    <img src={qr} alt="Download your referral QR code" width={160} height={160} />
                    <span className="text-sm underline">Download QR</span>
                  </a>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Your shareable link will appear when the public site address is ready. Your referral
                code is shown above.
              </p>
            )}
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Ask your referral to include your code in their inquiry. A click is not a confirmed
              sale. Cross-device visits or missing codes may require review.
            </p>
          </div>
          <div className={panel}>
            <p className="eyebrow">Your agreement</p>
            <h2 className="mt-4 font-serif text-3xl">
              {partner.rate_bps === null
                ? "Terms pending"
                : partner.rate_bps / 100 + "% commission"}
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
              {partner.terms ||
                "The team will confirm your commission terms before earnings are approved."}
            </p>
            <p className="mt-5 text-xs text-muted-foreground">
              Hold period: {partner.hold_days} days. Paid commission to date: {money(totals.paid)}.
            </p>
          </div>
        </div>
      )}
      {(tab === "sales" || tab === "overview") && (
        <div className={panel + " mt-8 overflow-x-auto"}>
          <h2 className="mb-5 font-serif text-2xl">Recorded sales</h2>
          {!visible.length ? (
            <p className="text-sm text-muted-foreground">
              No paid sales recorded for this period yet.
            </p>
          ) : (
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3">Order</th>
                  <th>Date</th>
                  <th>Net sales</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => {
                  const entries = commissions.filter((c) => c.order_id === o.id);
                  return (
                    <tr key={o.id} className="border-b border-border/60">
                      <td className="py-4">{o.reference}</td>
                      <td>{new Date(o.paid_at).toLocaleDateString()}</td>
                      <td>{money(o.net_cents - o.refunded_cents)}</td>
                      <td>{money(entries.reduce((a, c) => a + c.cents, 0))}</td>
                      <td>
                        {o.refunded_cents
                          ? "Adjusted"
                          : entries.every((c) => c.payout_id)
                            ? "Paid"
                            : entries.every((c) => c.approved)
                              ? "Approved"
                              : "Pending"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {tab === "payouts" && (
        <div className={panel}>
          <h2 className="mb-5 font-serif text-3xl">Payout history</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            These records reflect payments recorded by the team, not automatic transfers.
          </p>
          {!payouts.length ? (
            <p>No payouts recorded yet.</p>
          ) : (
            payouts.map((p) => (
              <div key={p.id} className="flex justify-between border-b py-4">
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
                <strong>{money(p.amount_cents)}</strong>
              </div>
            ))
          )}
        </div>
      )}
      {tab === "assets" && (
        <div className={panel}>
          <h2 className="font-serif text-3xl">Represent the brand clearly.</h2>
          <p className="my-5 text-sm">
            Use research-focused language and disclose your financial relationship wherever you
            endorse the brand.
          </p>
          <a href="/partner-assets/brand-guide.txt" download className={button}>
            Download partner copy guide
          </a>
          <p className="mt-5 text-sm text-muted-foreground">
            Product photography and campaign assets can be requested from the team. Do not make
            human-use, treatment, or unsupported testing claims.
          </p>
        </div>
      )}
    </section>
  );
}
