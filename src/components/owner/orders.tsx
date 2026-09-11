import { useEffect, useState } from "react";
import { rpc, money, fmtDate, fmtDateTime, button, outline, field, errorText, pct, paymentLabel, toCents, centsToInput, todayISO } from "@/lib/backend";
import { useOwner } from "@/components/owner/owner-context";
import type { OrderRecord, OrderRow } from "@/lib/program-types";
import { FULFILMENT_LABEL, STATUS_LABEL } from "@/lib/program-types";
import { Empty, Modal, Notice, Pill, TableWrap, td, th } from "@/components/program-ui";
import { SaleOutcome } from "@/components/owner/record-sale";
import { actionLabel } from "@/components/owner/overview";

function monthBounds(offset: number) {
  const [y, m] = todayISO().split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1 + offset, 1));
  const end = new Date(Date.UTC(y, m + offset, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

export function Orders() {
  const { version, focus, setFocus } = useOwner();
  const [range, setRange] = useState("this");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (focus?.tab === "orders") {
      setOpenId(focus.id);
      setFocus(null);
    }
  }, [focus, setFocus]);

  useEffect(() => {
    const b = range === "this" ? monthBounds(0) : range === "last" ? monthBounds(-1) : { from: null, to: null };
    const t = window.setTimeout(() => {
      rpc("nsp_owner_orders", { p_from: b.from, p_to: b.to, p_status: status || null, p_q: q || null, p_limit: 300 })
        .then((r) => setRows(r as OrderRow[]))
        .catch((e) => setError(errorText(e)));
    }, 250);
    return () => window.clearTimeout(t);
  }, [range, status, q, version]);

  const total = (rows ?? []).filter((r) => ["paid", "fulfilled"].includes(r.status)).reduce((a, r) => a + r.product_paid_cents - r.refunded_cents, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <input className={field + " max-w-xs"} placeholder="Search customer, reference, ord_…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={field + " w-auto"} value={range} onChange={(e) => setRange(e.target.value)} aria-label="Period">
          <option value="this">This month</option>
          <option value="last">Last month</option>
          <option value="all">All time</option>
        </select>
        <select className={field + " w-auto"} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {rows && <p className="text-sm text-muted-foreground">{rows.length} sales · {money(total)} confirmed product revenue</p>}
      {!rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty>No sales in this view.</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Customer</th>
              <th className={th}>Products</th>
              <th className={th + " text-right"}>Paid</th>
              <th className={th}>Status</th>
              <th className={th}>Type</th>
              <th className={th}>Ambassador</th>
              <th className={th + " text-right"}>Commission</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => setOpenId(o.id)}>
                <td className={td + " whitespace-nowrap"}>
                  {fmtDate(o.paid_on ?? o.order_date)}
                  <p className="text-xs text-muted-foreground">{o.public_id}</p>
                </td>
                <td className={td}>{o.customer_name}</td>
                <td className={td + " max-w-[16rem] truncate text-xs"}>{o.items}</td>
                <td className={td + " text-right tabular-nums"}>
                  {money(o.product_paid_cents)}
                  {o.refunded_cents ? <p className="text-xs text-destructive">−{money(o.refunded_cents)}</p> : null}
                </td>
                <td className={td}><Pill value={o.status} label={STATUS_LABEL[o.status]} /></td>
                <td className={td}>
                  <Pill value={o.classification} />
                  {o.flags.length > 0 && <p className="mt-1 text-[0.65rem] text-destructive">{o.flags.join(", ").replace(/_/g, " ")}</p>}
                </td>
                <td className={td}>{o.partner_name ?? "—"}</td>
                <td className={td + " text-right tabular-nums"}>{o.commission_cents ? money(o.commission_cents) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {openId && <OrderDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { version, refresh, setFocus } = useOwner();
  const [o, setO] = useState<OrderRecord | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"" | "status" | "refund" | "edit">("");

  useEffect(() => {
    rpc("nsp_order_detail", { p_order: id })
      .then((r) => setO(r as OrderRecord))
      .catch((e) => setError(errorText(e)));
  }, [id, version]);

  return (
    <Modal open onClose={onClose} title={o ? `Sale ${o.public_id}` : "Sale"} wide>
      {error && <Notice tone="error">{error}</Notice>}
      {!o ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-5 text-sm">
          <SaleOutcome o={o} />
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Customer</dt>
              <dd><button className="text-left text-primary underline" onClick={() => { onClose(); setFocus({ tab: "customers", id: o.customer_id }); }}>
                {o.customer.first_name} {o.customer.last_name}</button></dd></div>
            <div><dt className="text-xs text-muted-foreground">Status</dt><dd>{STATUS_LABEL[o.status]}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Payment confirmed</dt><dd>{fmtDate(o.paid_on)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Payment method</dt><dd>{paymentLabel(o.payment_method)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Amount paid (products)</dt><dd>{money(o.product_paid_cents)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Discount</dt><dd>{money(o.discount_cents)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Qualified revenue</dt><dd>{money(o.qualified_cents - o.refunded_cents)}{o.excluded_cents ? ` (${money(o.excluded_cents)} excluded)` : ""}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Shipping charged</dt><dd>{money(o.shipping_cents)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Fulfilment</dt><dd>{FULFILMENT_LABEL[o.fulfillment_status]}{o.fulfillment_method ? ` · ${o.fulfillment_method === "pickup" ? "pickup" : "ship"}` : ""}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Reference</dt><dd>{o.reference ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Commission</dt><dd>{o.commission_cents ? `${pct(o.commission_bps)} · ${money(o.commission_cents)}` : "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Referral input</dt><dd>{o.referred_partner_name ?? "—"}{o.referral_source ? ` (${o.referral_source})` : ""}</dd></div>
          </dl>
          <div>
            <p className="text-xs text-muted-foreground">Products</p>
            <ul className="mt-1">
              {o.items.map((i, n) => (
                <li key={n}>
                  {i.quantity} × {i.product_name}
                  {i.line_cents != null ? ` · ${money(i.line_cents)}` : ""}
                  {i.eligible === false ? " · excluded" : ""}
                </li>
              ))}
            </ul>
          </div>
          {o.notes && <p className="whitespace-pre-wrap rounded-lg bg-secondary/40 p-3">{o.notes}</p>}
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => setMode("status")}>Change status / fulfilment</button>
            {["paid", "fulfilled", "disputed", "refunded"].includes(o.status) && (
              <button className={outline} onClick={() => setMode("refund")}>Refund</button>
            )}
            <button className={outline} onClick={() => setMode("edit")}>Edit amounts & details</button>
          </div>
          {mode === "status" && <StatusForm o={o} onDone={() => { setMode(""); refresh(); }} />}
          {mode === "refund" && <RefundForm o={o} onDone={() => { setMode(""); refresh(); }} />}
          {mode === "edit" && <EditForm o={o} onDone={() => { setMode(""); refresh(); }} />}
          {o.history && o.history.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">History</p>
              <ul className="mt-1 grid gap-0.5 text-xs text-muted-foreground">
                {o.history.map((h, i) => (
                  <li key={i}>{fmtDateTime(h.at)} · {actionLabel(h.action)}{h.reason ? ` — ${h.reason}` : ""}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function useSubmit(fn: () => Promise<unknown>, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setBusy(true);
    setError("");
    try {
      await fn();
      onDone();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

const confirmed = (s: string) => ["paid", "fulfilled", "refunded", "disputed"].includes(s);

function StatusForm({ o, onDone }: { o: OrderRecord; onDone: () => void }) {
  const [status, setStatus] = useState<string>(o.status);
  const [paidOn, setPaidOn] = useState(o.paid_on ?? todayISO());
  const [fulfil, setFulfil] = useState(o.fulfillment_status);
  const [reason, setReason] = useState("");
  const needReason = confirmed(o.status) && (status !== o.status || paidOn !== (o.paid_on ?? paidOn));
  const { busy, error, run } = useSubmit(
    () => rpc("nsp_update_order", {
      p_order: o.id,
      p: { status, fulfillment_status: fulfil, ...(confirmed(status) ? { paid_on: paidOn } : {}) },
      p_reason: reason || null,
    }),
    onDone,
  );
  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1">Status
          <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        {confirmed(status) && (
          <label className="grid gap-1">Payment confirmed on
            <input type="date" className={field} value={paidOn} max={todayISO()} onChange={(e) => setPaidOn(e.target.value)} />
          </label>
        )}
        <label className="grid gap-1">Fulfilment
          <select className={field} value={fulfil} onChange={(e) => setFulfil(e.target.value)}>
            {Object.entries(FULFILMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {(needReason || ["cancelled", "refunded", "disputed"].includes(status)) && (
        <label className="grid gap-1">Reason {needReason ? "(required)" : ""}
          <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <button className={button + " w-fit"} disabled={busy || (needReason && reason.trim().length < 3)} onClick={run}>Save</button>
    </div>
  );
}

function RefundForm({ o, onDone }: { o: OrderRecord; onDone: () => void }) {
  const [amount, setAmount] = useState(centsToInput(o.qualified_cents - o.refunded_cents));
  const [reason, setReason] = useState("");
  const cents = toCents(amount);
  const { busy, error, run } = useSubmit(
    () => rpc("nsp_refund_order", { p_order: o.id, p_total: (cents ?? 0) + o.refunded_cents, p_reason: reason }),
    onDone,
  );
  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">
        Refunds reduce qualified revenue; commission is recalculated automatically. Refunding the full {money(o.qualified_cents)} marks the sale refunded.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">Refund amount
          <input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="grid gap-1">Reason (required)
          <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <button className={button + " w-fit"} disabled={busy || cents == null || cents <= 0 || reason.trim().length < 3} onClick={run}>Record refund</button>
    </div>
  );
}

function EditForm({ o, onDone }: { o: OrderRecord; onDone: () => void }) {
  const [paid, setPaid] = useState(centsToInput(o.product_paid_cents));
  const [discount, setDiscount] = useState(centsToInput(o.discount_cents));
  const [shipping, setShipping] = useState(centsToInput(o.shipping_cents));
  const [reference, setReference] = useState(o.reference ?? "");
  const [notes, setNotes] = useState(o.notes ?? "");
  const [exclude, setExclude] = useState(o.manual_exclude);
  const [excludeReason, setExcludeReason] = useState(o.exclude_reason ?? "");
  const [reason, setReason] = useState("");
  const paidCents = toCents(paid);
  const changedMoney = paidCents !== o.product_paid_cents || exclude !== o.manual_exclude;
  const needReason = confirmed(o.status) && changedMoney;
  const { busy, error, run } = useSubmit(
    () => rpc("nsp_update_order", {
      p_order: o.id,
      p: {
        product_paid_cents: paidCents, discount_cents: toCents(discount || "0") ?? 0, shipping_cents: toCents(shipping || "0") ?? 0,
        reference, notes, manual_exclude: exclude, exclude_reason: exclude ? excludeReason : null,
      },
      p_reason: reason || null,
    }),
    onDone,
  );
  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1">Amount paid (products)<input className={field} inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} /></label>
        <label className="grid gap-1">Discount<input className={field} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
        <label className="grid gap-1">Shipping charged<input className={field} inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} /></label>
        <label className="grid gap-1 sm:col-span-3">Reference<input className={field} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
        <label className="grid gap-1 sm:col-span-3">Notes<textarea className={field} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
        Exclude this sale from ambassador revenue (fraud, giveaway, other)</label>
      {exclude && <input className={field} placeholder="Why is it excluded?" value={excludeReason} onChange={(e) => setExcludeReason(e.target.value)} />}
      {needReason && (
        <label className="grid gap-1">Reason for changing a confirmed sale (required)
          <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <button className={button + " w-fit"} disabled={busy || paidCents == null || (needReason && reason.trim().length < 3)} onClick={run}>Save changes</button>
    </div>
  );
}
