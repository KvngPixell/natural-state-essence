import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePortal } from "@/components/portal-context";
import { db, rpc, edge, money, field, button, outline, panel } from "@/lib/backend";
import {
  balances,
  type Partner,
  type Order,
  type Commission,
  type Payout,
  type RequestRecord,
} from "@/lib/portal-types";
export const Route = createFileRoute("/admin/ambassadors")({
  head: () => ({
    meta: [
      { title: "Owner Controls — Natural State Peptides" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});
const value = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const cents = (s: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new Error("Enter a valid USD amount with up to two decimals.");
  return Math.round(Number(s) * 100);
};
function Admin() {
  const { user, admin, loading } = usePortal();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [entries, setEntries] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [tab, setTab] = useState("partners");
  const [selected, setSelected] = useState<Partner | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    if (!db) return;
    const results = await Promise.all([
      db.from("nsp_partners").select("*").order("created_at", { ascending: false }),
      db.from("nsp_orders").select("*").order("paid_at", { ascending: false }),
      db.from("nsp_commissions").select("*"),
      db.from("nsp_payouts").select("*").order("created_at", { ascending: false }),
      db.from("nsp_requests").select("*").order("created_at", { ascending: false }),
    ]);
    for (const r of results) if (r.error) throw r.error;
    setPartners(results[0]?.data ?? []);
    setOrders(results[1]?.data ?? []);
    setEntries(results[2]?.data ?? []);
    setPayouts(results[3]?.data ?? []);
    setRequests(results[4]?.data ?? []);
  }
  useEffect(() => {
    if (admin) void refresh().catch((e) => setStatus(e.message));
    else {
      setPartners([]);
      setOrders([]);
      setEntries([]);
      setPayouts([]);
      setRequests([]);
    }
  }, [admin, user?.id]);
  async function run(fn: () => Promise<unknown>, success = "Saved.") {
    setBusy(true);
    setStatus("");
    try {
      await fn();
      await refresh();
      setStatus(success);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Action could not be completed.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const rows = [
      ["Ambassador code", "Name", "Pending USD", "Approved unpaid USD", "Paid USD"],
      ...partners.map((p) => {
        const b = balances(entries.filter((c) => c.partner_id === p.id));
        return [
          p.code,
          p.name,
          (b.pending / 100).toFixed(2),
          (b.approved / 100).toFixed(2),
          (b.paid / 100).toFixed(2),
        ];
      }),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((s) => '"' + (/^[=+@\t\r-]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"')
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "natural-state-commissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (loading) return <p className="p-12 text-center">Checking owner access…</p>;
  if (!user || !admin)
    return (
      <section className="mx-auto max-w-lg px-5 py-20">
        <h1 className="font-serif text-4xl">Owner access required</h1>
        <p className="my-5">This area is restricted to authorized owners.</p>
        <Link to="/ambassador/login" className={button}>
          Sign in
        </Link>
      </section>
    );
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="eyebrow">Natural State Operations</p>
          <h1 className="mt-3 font-serif text-5xl">Owner controls</h1>
        </div>
        <button className={outline} onClick={() => db?.auth.signOut()}>
          Sign out
        </button>
      </div>
      <div className="my-7 grid gap-4 sm:grid-cols-3">
        {[
          ["Ambassadors", partners.length],
          ["Recorded paid orders", orders.length],
          ["New inquiries", requests.filter((r) => r.status === "new").length],
        ].map(([k, v]) => (
          <div key={k} className={panel}>
            <p className="text-sm text-muted-foreground">{k}</p>
            <p className="mt-2 font-serif text-4xl">{v}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        {["partners", "inquiries", "orders", "payouts"].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            className={tab === t ? button : outline}
            onClick={() => setTab(t)}
          >
            {t === "partners" ? "Ambassadors" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button
          className={outline}
          disabled={busy}
          onClick={() => run(refresh, "Records refreshed.")}
        >
          Refresh
        </button>
      </div>
      <p role="status" aria-live="polite" className="mb-5 rounded-lg bg-secondary/60 p-3 text-sm">
        {busy ? "Working…" : status || "Sales and payouts must be verified before recording."}
      </p>
      {tab === "partners" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className={panel}>
            <div className="mb-5 flex justify-between">
              <h2 className="font-serif text-3xl">Ambassadors</h2>
              <button className={outline} onClick={() => setSelected(null)}>
                New ambassador
              </button>
            </div>
            {!partners.length ? (
              <p className="text-sm">
                No ambassador records yet. Review applications in Inquiries, then add an approved
                ambassador.
              </p>
            ) : (
              partners.map((p) => (
                <div key={p.id} className="border-b py-4">
                  <button className="text-left" onClick={() => setSelected(p)}>
                    <strong>{p.name}</strong>
                    <p className="text-sm">
                      {p.code} · {p.status} ·{" "}
                      {p.rate_bps === null ? "Terms unset" : p.rate_bps / 100 + "%"}
                    </p>
                  </button>
                  {!p.user_id && (
                    <button
                      disabled={busy || p.status === "suspended"}
                      className={outline + " mt-3"}
                      onClick={() =>
                        run(
                          () => edge({ action: "invite", id: p.id }),
                          "Invitation sent and account linked.",
                        )
                      }
                    >
                      Send account invitation
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <form
            key={selected?.id ?? "new"}
            className={panel + " grid gap-4"}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(
                () =>
                  rpc("nsp_save_partner", {
                    p_id: selected?.id ?? null,
                    p_name: value(f, "name"),
                    p_email: selected?.email ?? value(f, "email"),
                    p_code: value(f, "code"),
                    p_status: value(f, "status"),
                    p_rate: value(f, "rate") ? Math.round(Number(value(f, "rate")) * 100) : null,
                    p_terms: value(f, "terms"),
                    p_hold: Number(value(f, "hold")),
                  }),
                "Ambassador saved. Send an invitation to enable a new account.",
              );
            }}
          >
            <h2 className="font-serif text-3xl">
              {selected ? "Edit ambassador" : "Add approved ambassador"}
            </h2>
            <label className="grid gap-2 text-sm">
              Name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={selected?.name ?? ""}
                className={field}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Email
              <input
                name="email"
                type="email"
                required
                disabled={!!selected}
                defaultValue={selected?.email ?? ""}
                className={field}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Unique referral code
              <input
                name="code"
                required
                pattern="[A-Za-z0-9_-]{3,32}"
                defaultValue={selected?.code ?? ""}
                className={field}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Status
              <select name="status" defaultValue={selected?.status ?? "pending"} className={field}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                Agreed commission % (optional)
                <input
                  name="rate"
                  type="number"
                  min={0}
                  max={50}
                  step=".01"
                  defaultValue={selected?.rate_bps == null ? "" : selected.rate_bps / 100}
                  className={field}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Hold days
                <input
                  name="hold"
                  type="number"
                  required
                  min={0}
                  max={180}
                  defaultValue={selected?.hold_days ?? 30}
                  className={field}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm">
              Agreed terms
              <textarea
                name="terms"
                rows={4}
                defaultValue={selected?.terms ?? ""}
                placeholder="Calculation basis, attribution, refunds, payout schedule, repeat-order rules…"
                className={field}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Rates apply to future recorded orders. Existing orders keep their agreed rate. No
              commissions are generated from clicks or inquiries.
            </p>
            <button disabled={busy} className={button}>
              Save ambassador
            </button>
          </form>
        </div>
      )}
      {tab === "inquiries" && (
        <div className="grid gap-4">
          {!requests.length ? (
            <div className={panel}>No inquiries received yet.</div>
          ) : (
            requests.map((r) => (
              <article key={r.id} className={panel}>
                <div className="flex flex-wrap justify-between gap-3">
                  <h2 className="font-serif text-2xl">
                    {r.kind === "application"
                      ? "Ambassador application"
                      : r.kind.toUpperCase() + " inquiry"}{" "}
                    · {r.name}
                  </h2>
                  <span className="text-xs">
                    {new Date(r.created_at).toLocaleString()} · {r.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {r.email} · {r.product} {r.lot ? "· Lot " + r.lot : ""}
                </p>
                <p className="mt-2 text-sm">
                  Referral: {r.referral_code || "None"} · Notification: {r.email_status}
                </p>
                <p className="my-5 whitespace-pre-wrap break-words text-sm">{r.message}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={busy}
                    className={outline}
                    onClick={() =>
                      run(() => rpc("nsp_request_status", { p_id: r.id, p_status: "reviewed" }))
                    }
                  >
                    Mark reviewed
                  </button>
                  <button
                    disabled={busy}
                    className={outline}
                    onClick={() =>
                      run(() => rpc("nsp_request_status", { p_id: r.id, p_status: "closed" }))
                    }
                  >
                    Close request
                  </button>
                  {r.email_status !== "accepted" && (
                    <button
                      disabled={busy}
                      className={outline}
                      onClick={() =>
                        run(async () => {
                          const d = await edge({ action: "retry_notice", id: r.id });
                          if (d.notification !== "accepted")
                            throw new Error("Notification status: " + d.notification);
                        }, "Notification accepted by email provider.")
                      }
                    >
                      Retry owner notification
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}
      {tab === "orders" && (
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <form
            className={panel + " grid gap-4 self-start"}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(
                () =>
                  rpc("nsp_record_order", {
                    p_partner: value(f, "partner"),
                    p_reference: value(f, "reference"),
                    p_products: value(f, "products"),
                    p_net: cents(value(f, "amount")),
                    p_paid_at: new Date(value(f, "date")).toISOString(),
                  }),
                "Paid order recorded; commission calculated.",
              );
            }}
          >
            <h2 className="font-serif text-3xl">Record paid order</h2>
            <label className="grid gap-2 text-sm">
              Attributed ambassador
              <select name="partner" required className={field}>
                <option value="">Select active ambassador</option>
                {partners
                  .filter((p) => p.status === "active")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.code}
                    </option>
                  ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Unique order/payment reference
              <input name="reference" required maxLength={120} className={field} />
            </label>
            <label className="grid gap-2 text-sm">
              Products and quantities
              <textarea name="products" required maxLength={1000} className={field} />
            </label>
            <label className="grid gap-2 text-sm">
              Paid merchandise USD, after discounts
              <input
                name="amount"
                type="number"
                min=".01"
                max="1000000"
                step=".01"
                required
                className={field}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Exclude shipping and tax. Enter confirmed payments only.
            </p>
            <label className="grid gap-2 text-sm">
              Payment date and time
              <input name="date" type="datetime-local" required className={field} />
            </label>
            <label className="flex gap-3 text-sm">
              <input type="checkbox" required />I verified payment and ambassador attribution.
            </label>
            <button disabled={busy} className={button}>
              Record confirmed sale
            </button>
          </form>
          <div className="grid gap-4 content-start">
            {!orders.length ? (
              <div className={panel}>No paid orders recorded.</div>
            ) : (
              orders.map((o) => (
                <article key={o.id} className={panel}>
                  <h2 className="font-serif text-2xl">{o.reference}</h2>
                  <p className="mt-2 text-sm">
                    {partners.find((p) => p.id === o.partner_id)?.name} · {o.product_summary}
                  </p>
                  <p className="mt-3">
                    {money(o.net_cents - o.refunded_cents)} net · {o.rate_bps / 100}% rate
                  </p>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm">Record a refund adjustment</summary>
                    <form
                      className="mt-4 grid gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void run(
                          () =>
                            rpc("nsp_refund", {
                              p_order: o.id,
                              p_total: cents(value(f, "total")),
                              p_reference: value(f, "ref"),
                            }),
                          "Refund and commission adjustment recorded.",
                        );
                      }}
                    >
                      <label className="grid gap-2 text-sm">
                        Total merchandise refunded to date (USD)
                        <input
                          name="total"
                          type="number"
                          min={(o.refunded_cents + 1) / 100}
                          max={o.net_cents / 100}
                          step=".01"
                          required
                          className={field}
                        />
                      </label>
                      <label className="grid gap-2 text-sm">
                        Unique refund reference
                        <input name="ref" required maxLength={120} className={field} />
                      </label>
                      <p className="text-xs">
                        Already refunded: {money(o.refunded_cents)}. Adjustments offset future
                        unpaid commission if earlier commission was paid.
                      </p>
                      <button disabled={busy} className={outline}>
                        Record confirmed refund
                      </button>
                    </form>
                  </details>
                </article>
              ))
            )}
          </div>
        </div>
      )}
      {tab === "payouts" && (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Record payments only after sending them through your chosen payment method.
            </p>
            <button className={outline} onClick={download}>
              Export commission balances
            </button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {partners.map((p) => {
              const b = balances(entries.filter((c) => c.partner_id === p.id));
              return (
                <div key={p.id} className={panel}>
                  <h2 className="font-serif text-3xl">{p.name}</h2>
                  <p className="my-4 text-sm">
                    Pending {money(b.pending)} · Approved unpaid {money(b.approved)} · Paid{" "}
                    {money(b.paid)}
                  </p>
                  <button
                    disabled={busy}
                    className={outline}
                    onClick={() =>
                      run(
                        () => rpc("nsp_approve", { p_partner: p.id }),
                        "Eligible commissions approved.",
                      )
                    }
                  >
                    Approve eligible commissions
                  </button>
                  <form
                    className="mt-5 grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void run(
                        () =>
                          rpc("nsp_record_payout", {
                            p_partner: p.id,
                            p_expected: b.approved,
                            p_reference: value(f, "ref"),
                          }),
                        "Payout recorded. No funds were transferred by this site.",
                      );
                    }}
                  >
                    <label className="grid gap-2 text-sm">
                      Actual payout reference
                      <input name="ref" required maxLength={120} className={field} />
                    </label>
                    <label className="flex gap-3 text-sm">
                      <input type="checkbox" required />I have sent {money(b.approved)} to this
                      ambassador.
                    </label>
                    <button className={button} disabled={busy || b.approved <= 0}>
                      Record completed payout
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
          <div className={panel + " mt-6"}>
            <h2 className="mb-4 font-serif text-3xl">Recorded payouts</h2>
            {!payouts.length ? (
              <p>No payouts recorded.</p>
            ) : (
              payouts.map((p) => (
                <p className="border-b py-3 text-sm" key={p.id}>
                  {partners.find((x) => x.id === p.partner_id)?.name} · {money(p.amount_cents)} ·{" "}
                  {p.reference} · {new Date(p.created_at).toLocaleDateString()}
                </p>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
