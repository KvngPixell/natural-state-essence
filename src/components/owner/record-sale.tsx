import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { products, getProductBySlug } from "@/data/products";
import {
  rpc, money, pct, fmtDate, field, button, outline, toCents, todayISO, errorText, PAYMENT_METHODS,
} from "@/lib/backend";
import type { Ambassador, CustomerSummary, OrderRecord, RequestRecord } from "@/lib/program-types";
import { Modal, Notice, Pill } from "@/components/program-ui";

export interface SalePrefill {
  request?: RequestRecord;
  customer?: CustomerSummary;
  ambassadorId?: string;
}

interface Line {
  slug: string; // product slug, or "" for a custom product name
  name: string;
  quantity: number;
  amount: string; // optional line amount (dollars)
  giveaway: boolean;
}

const blankLine = (): Line => ({ slug: "", name: "", quantity: 1, amount: "", giveaway: false });
const small = "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-accent";

function linesFromRequest(r: RequestRecord | undefined): Line[] {
  if (!r) return [blankLine()];
  if (r.order_items?.length) {
    return r.order_items.map((i) => {
      const p = i.slug ? getProductBySlug(i.slug) : undefined;
      return { slug: p?.slug ?? "", name: p ? "" : i.name, quantity: i.quantity, amount: "", giveaway: false };
    });
  }
  if (r.product) {
    const p = products.find((x) => r.product?.startsWith(x.name));
    return [{ slug: p?.slug ?? "", name: p ? "" : r.product, quantity: 1, amount: "", giveaway: false }];
  }
  return [blankLine()];
}

export function RecordSale({
  open,
  prefill,
  onClose,
  onSaved,
}: {
  open: boolean;
  prefill?: SalePrefill;
  onClose: () => void;
  onSaved: () => void;
}) {
  // ---- form state -------------------------------------------------------
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [shipping, setShipping] = useState("");
  const [status, setStatus] = useState("paid");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [payment, setPayment] = useState("");
  const [fulfilMethod, setFulfilMethod] = useState("");
  const [fulfilStatus, setFulfilStatus] = useState("unfulfilled");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [ambassadorId, setAmbassadorId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestAmbassador, setRequestAmbassador] = useState<string | null>(null);
  // ---- server-derived state ---------------------------------------------
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [match, setMatch] = useState<{ exact: CustomerSummary | null; possible: CustomerSummary[] } | null>(null);
  const [preview, setPreview] = useState<OrderRecord | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<OrderRecord | null>(null);
  const [nameSearch, setNameSearch] = useState("");
  const [nameResults, setNameResults] = useState<CustomerSummary[] | null>(null);

  function reset(p?: SalePrefill) {
    const r = p?.request;
    setCustomer(p?.customer ?? null);
    setEmail(r?.email ?? "");
    setPhone(r?.phone ?? "");
    setFirst(r?.first_name ?? (r?.name ? r.name.split(" ")[0] : ""));
    setLast(r?.last_name ?? (r?.name ? r.name.split(" ").slice(1).join(" ") : ""));
    setLines(linesFromRequest(r));
    setPaid("");
    setDiscount("");
    setShipping("");
    setStatus("paid");
    setPaidOn(todayISO());
    setPayment(r?.payment_method ?? "");
    setFulfilMethod(r?.fulfillment_method ?? "");
    setFulfilStatus("unfulfilled");
    setReference("");
    setNotes(r?.payment_other ? "Payment: " + r.payment_other : "");
    setAmbassadorId(p?.ambassadorId ?? "");
    setOverrideReason("");
    setShowMore(false);
    setRequestId(r?.id ?? null);
    setRequestAmbassador(r?.ambassador_name ?? null);
    setMatch(null);
    setPreview(null);
    setPreviewError("");
    setError("");
    setSaved(null);
    setNameSearch("");
    setNameResults(null);
  }
  useEffect(() => {
    if (open) {
      reset(prefill);
      rpc("nsp_owner_ambassadors", { p_month: null })
        .then((a) => setAmbassadors((a as Ambassador[]).filter((x) => x.status !== "archived")))
        .catch(() => setAmbassadors([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  // ---- customer matching (debounced) -------------------------------------
  useEffect(() => {
    if (!open || customer) return;
    const e = email.trim();
    const digits = phone.replace(/\D/g, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && digits.length < 7) {
      setMatch(null);
      return;
    }
    const t = window.setTimeout(() => {
      rpc("nsp_match_customer", { p_email: e || null, p_phone: phone || null, p_first: first || null, p_last: last || null })
        .then((m) => setMatch(m as typeof match))
        .catch(() => setMatch(null));
    }, 450);
    return () => window.clearTimeout(t);
  }, [open, customer, email, phone, first, last]);

  useEffect(() => {
    if (!nameSearch.trim()) return setNameResults(null);
    const t = window.setTimeout(() => {
      rpc("nsp_find_customers", { p_q: nameSearch.trim(), p_limit: 8 })
        .then((r) => setNameResults(r as CustomerSummary[]))
        .catch(() => setNameResults([]));
    }, 350);
    return () => window.clearTimeout(t);
  }, [nameSearch]);

  // ---- payload + live preview -------------------------------------------
  const paidCents = toCents(paid);
  const attribution = customer?.attribution ?? match?.exact?.attribution ?? null;
  const attributedId = attribution && attribution.status !== "expired" ? attribution.partner_id : null;
  const overriding = Boolean(ambassadorId && attributedId && ambassadorId !== attributedId);

  const payload = useMemo(() => {
    const items = lines
      .filter((l) => l.slug || l.name.trim())
      .map((l) => {
        const p = l.slug ? getProductBySlug(l.slug) : undefined;
        const amt = l.amount.trim() ? toCents(l.amount) : null;
        return {
          product_slug: p?.slug ?? null,
          product_name: p ? `${p.name} ${p.strength}` : l.name.trim(),
          quantity: l.quantity,
          line_cents: amt,
          giveaway: l.giveaway,
        };
      });
    const needsPaidDate = ["paid", "fulfilled"].includes(status);
    return {
      customer_id: customer?.id ?? null,
      customer: customer ? null : { first_name: first.trim(), last_name: last.trim() || null, email: email.trim() || null, phone: phone.trim() || null },
      request_id: requestId,
      items,
      product_paid_cents: paidCents,
      discount_cents: toCents(discount || "0") ?? 0,
      shipping_cents: toCents(shipping || "0") ?? 0,
      status,
      paid_on: needsPaidDate ? paidOn : null,
      order_date: needsPaidDate ? paidOn : todayISO(),
      payment_method: payment || null,
      fulfillment_method: fulfilMethod || null,
      fulfillment_status: fulfilStatus,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      ambassador_id: ambassadorId || null,
      attribution_override: overriding,
      override_reason: overriding ? overrideReason.trim() : null,
    };
  }, [customer, first, last, email, phone, requestId, lines, paidCents, discount, shipping, status, paidOn, payment, fulfilMethod, fulfilStatus, reference, notes, ambassadorId, overriding, overrideReason]);

  const ready =
    payload.items.length > 0 &&
    paidCents != null &&
    (customer || (first.trim() && (email.trim() || phone.replace(/\D/g, "").length >= 7))) &&
    (!overriding || overrideReason.trim().length >= 3);

  const seq = useRef(0);
  useEffect(() => {
    if (!open || !ready || saved) {
      setPreview(null);
      return;
    }
    const mine = ++seq.current;
    const t = window.setTimeout(() => {
      rpc("nsp_sale_preview", { p: payload })
        .then((r) => {
          if (mine === seq.current) {
            setPreview(r as OrderRecord);
            setPreviewError("");
          }
        })
        .catch((e) => {
          if (mine === seq.current) {
            setPreview(null);
            setPreviewError(errorText(e));
          }
        });
    }, 500);
    return () => window.clearTimeout(t);
  }, [open, ready, saved, payload]);

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      const r = (await rpc("nsp_record_sale", { p: payload })) as OrderRecord;
      setSaved(r);
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  // ---- success -----------------------------------------------------------
  if (saved) {
    return (
      <Modal open={open} onClose={onClose} title="Sale recorded">
        <div className="grid gap-4">
          <Notice tone="ok">
            {saved.public_id} saved for {saved.customer.first_name} {saved.customer.last_name ?? ""} ·{" "}
            {money(saved.product_paid_cents)}
          </Notice>
          <SaleOutcome o={saved} />
          <div className="flex flex-wrap gap-3">
            <button className={button} onClick={() => reset()}>
              <Plus className="size-4" /> Record another sale
            </button>
            <button className={outline} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ---- form ----------------------------------------------------------------
  return (
    <Modal open={open} onClose={onClose} title={requestId ? "Convert inquiry to sale" : "Record sale"} wide>
      <div className="grid gap-6">
        {/* CUSTOMER */}
        <section className="grid gap-3">
          <h3 className="text-[0.68rem] tracking-[0.2em] text-accent uppercase">1 · Customer</h3>
          {customer ? (
            <CustomerCard c={customer} onChange={() => setCustomer(null)} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={small} type="email" inputMode="email" placeholder="Email" autoFocus={!requestId}
                  value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Customer email" />
                <input className={small} type="tel" inputMode="tel" placeholder="Phone" value={phone}
                  onChange={(e) => setPhone(e.target.value)} aria-label="Customer phone" />
                <input className={small} placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} aria-label="First name" />
                <input className={small} placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} aria-label="Last name" />
              </div>
              {match?.exact && (
                <div className="rounded-xl border border-primary/30 bg-secondary/50 p-4">
                  <p className="text-[0.68rem] tracking-[0.2em] text-primary uppercase">Existing customer found</p>
                  <CustomerFacts c={match.exact} />
                  <button className={button + " mt-3"} onClick={() => setCustomer(match.exact)}>
                    <Check className="size-4" /> Use {match.exact.first_name}
                  </button>
                </div>
              )}
              {!match?.exact && match && match.possible.length > 0 && (
                <div className="rounded-xl border border-[oklch(0.83_0.08_78)] bg-[oklch(0.97_0.03_85)] p-4">
                  <p className="text-[0.68rem] tracking-[0.2em] text-[oklch(0.4_0.09_70)] uppercase">Possible duplicate</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Same phone or name as an existing record. Use it if it's the same person; otherwise continue to
                    create a new customer.
                  </p>
                  <ul className="mt-2 grid gap-2">
                    {match.possible.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>
                          {c.first_name} {c.last_name} · {c.email ?? c.phone} · {c.orders} orders
                        </span>
                        <button className={outline + " py-2"} onClick={() => setCustomer(c)}>
                          Use this customer
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {match && !match.exact && match.possible.length === 0 && first.trim() && (
                <p className="text-xs text-muted-foreground">New customer — a permanent customer ID is created when you confirm.</p>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-primary">
                  <Search className="mr-1 inline size-3.5" /> Search by name or customer ID instead
                </summary>
                <input className={small + " mt-2"} placeholder="Name, email, phone or cus_…" value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)} aria-label="Search customers" />
                {nameResults && (
                  <ul className="mt-2 grid gap-1">
                    {nameResults.length === 0 && <li className="text-xs text-muted-foreground">No matches.</li>}
                    {nameResults.map((c) => (
                      <li key={c.id}>
                        <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-secondary" onClick={() => setCustomer(c)}>
                          {c.first_name} {c.last_name} <span className="text-xs text-muted-foreground">· {c.email ?? c.phone} · {c.public_id}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </>
          )}
        </section>

        {/* ORDER */}
        <section className="grid gap-3">
          <h3 className="text-[0.68rem] tracking-[0.2em] text-accent uppercase">2 · Order</h3>
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-border p-3">
              <div className="flex gap-2">
                <select className={small + " flex-1"} value={l.slug || (l.name ? "__other" : "")} aria-label={`Product ${i + 1}`}
                  onChange={(e) => setLine(i, e.target.value === "__other" ? { slug: "", name: l.name || " " } : { slug: e.target.value, name: "" })}>
                  <option value="">Choose product…</option>
                  {products.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} — {p.strength}
                    </option>
                  ))}
                  <option value="__other">Other (type name)</option>
                </select>
                {lines.length > 1 && (
                  <button aria-label="Remove product" className="rounded-lg border border-border px-3 text-muted-foreground"
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                    <X className="size-4" />
                  </button>
                )}
              </div>
              {!l.slug && l.name !== "" && (
                <input className={small} placeholder="Product name" value={l.name.trimStart()} onChange={(e) => setLine(i, { name: e.target.value })} />
              )}
              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Qty
                  <input className={small} inputMode="numeric" value={l.quantity}
                    onChange={(e) => {
                      const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                      setLine(i, { quantity: Number.isFinite(n) ? Math.max(1, Math.min(1000, n)) : 1 });
                    }} />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Line amount (optional)
                  <input className={small} inputMode="decimal" placeholder="$" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={l.giveaway} onChange={(e) => setLine(i, { giveaway: e.target.checked })} />
                Free / giveaway (excluded from ambassador revenue)
              </label>
            </div>
          ))}
          <button className={outline + " w-fit py-2"} onClick={() => setLines((ls) => [...ls, blankLine()])}>
            <Plus className="size-4" /> Add product
          </button>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              Amount paid for products
              <input className={field} inputMode="decimal" placeholder="$0.00" value={paid} onChange={(e) => setPaid(e.target.value)} />
              <span className="text-xs text-muted-foreground">After discounts. Exclude shipping and tax.</span>
            </label>
            <label className="grid gap-1 text-sm">
              Discount given
              <input className={field} inputMode="decimal" placeholder="$0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Shipping charged
              <input className={field} inputMode="decimal" placeholder="$0" value={shipping} onChange={(e) => setShipping(e.target.value)} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Payment status
              <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="paid">Paid / confirmed</option>
                <option value="fulfilled">Paid and fulfilled</option>
                <option value="awaiting_payment">Awaiting payment</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            {["paid", "fulfilled"].includes(status) && (
              <label className="grid gap-1 text-sm">
                Payment confirmed on
                <input type="date" className={field} value={paidOn} max={todayISO()} onChange={(e) => setPaidOn(e.target.value)} />
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Payment method">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.value} type="button" onClick={() => setPayment(payment === m.value ? "" : m.value)}
                className={"rounded-full border px-3.5 py-2 text-sm " + (payment === m.value ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                {m.label}
              </button>
            ))}
          </div>
          <button type="button" className="w-fit text-sm text-primary underline" onClick={() => setShowMore((v) => !v)}>
            {showMore ? "Fewer details" : "Fulfilment, reference and notes"}
          </button>
          {showMore && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Shipping / pickup
                <select className={field} value={fulfilMethod} onChange={(e) => setFulfilMethod(e.target.value)}>
                  <option value="">—</option>
                  <option value="ship">Ship</option>
                  <option value="pickup">Local pickup</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Fulfilment status
                <select className={field} value={fulfilStatus} onChange={(e) => setFulfilStatus(e.target.value)}>
                  <option value="unfulfilled">Not yet sent</option>
                  <option value="ready">Ready</option>
                  <option value="shipped">Shipped</option>
                  <option value="picked_up">Picked up</option>
                  <option value="delivered">Delivered</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Order / payment reference
                <input className={field} maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                Internal notes
                <textarea className={field} rows={2} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>
          )}
        </section>

        {/* ATTRIBUTION */}
        <section className="grid gap-3">
          <h3 className="text-[0.68rem] tracking-[0.2em] text-accent uppercase">3 · Ambassador</h3>
          {attribution && attribution.status !== "expired" ? (
            <p className="text-sm">
              Customer is attributed to <strong className="text-primary">{attribution.partner_name}</strong>
              {attribution.status === "active" && attribution.residual_expires_on ? ` · residual until ${fmtDate(attribution.residual_expires_on)}` : ""}
              {attribution.status === "pending" ? " · pending first paid sale" : ""}.
            </p>
          ) : requestAmbassador ? (
            <p className="text-sm">
              Inquiry came through <strong className="text-primary">{requestAmbassador}</strong>'s referral.
            </p>
          ) : null}
          <label className="grid gap-1 text-sm">
            {attributedId ? "Change ambassador (correction)" : "Referred by (optional)"}
            <select className={field} value={ambassadorId} onChange={(e) => setAmbassadorId(e.target.value)}>
              <option value="">{attributedId ? "Keep current attribution" : requestAmbassador ? "Use inquiry referral" : "No ambassador"}</option>
              {ambassadors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name} · {a.code}
                  {a.status !== "active" ? ` (${a.status})` : ""}
                </option>
              ))}
            </select>
          </label>
          {overriding && (
            <label className="grid gap-1 text-sm">
              Reason for changing attribution (saved to the audit log)
              <input className={field} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </label>
          )}
        </section>

        {/* PREVIEW */}
        <section className="rounded-xl border border-border bg-secondary/40 p-4">
          {!ready ? (
            <p className="text-sm text-muted-foreground">Add the customer, a product and the amount paid to see the result.</p>
          ) : previewError ? (
            <Notice tone="error">{previewError}</Notice>
          ) : preview ? (
            <SaleOutcome o={preview} previewing />
          ) : (
            <p className="text-sm text-muted-foreground">Calculating…</p>
          )}
        </section>

        {error && <Notice tone="error">{error}</Notice>}
        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-background px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
          <button className={button + " flex-1 sm:flex-none"} disabled={!ready || saving || Boolean(previewError)} onClick={confirm}>
            {saving ? "Saving…" : "Confirm sale"}
          </button>
          <button className={outline} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CustomerFacts({ c }: { c: CustomerSummary }) {
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-xs text-muted-foreground">Customer</dt>
        <dd className="font-medium text-primary">
          {c.first_name} {c.last_name}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Customer since</dt>
        <dd>{fmtDate(c.first_purchase_on ?? c.created_at.slice(0, 10))}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Ambassador</dt>
        <dd>{c.attribution ? c.attribution.partner_name : "None"}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Residual</dt>
        <dd>
          {c.attribution ? <Pill value={c.attribution.status} /> : "—"}{" "}
          {c.attribution?.residual_expires_on ? <span className="text-xs">to {fmtDate(c.attribution.residual_expires_on)}</span> : null}
        </dd>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <dt className="sr-only">History</dt>
        <dd className="text-xs text-muted-foreground">
          {c.orders} previous paid order{c.orders === 1 ? "" : "s"} · {money(c.lifetime_cents)} lifetime · {c.public_id}
        </dd>
      </div>
    </dl>
  );
}

function CustomerCard({ c, onChange }: { c: CustomerSummary; onChange: () => void }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-secondary/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.68rem] tracking-[0.2em] text-primary uppercase">Customer selected</p>
        <button className="text-xs text-primary underline" onClick={onChange}>
          Change
        </button>
      </div>
      <CustomerFacts c={c} />
    </div>
  );
}

/** Shows what the engine decided (or will decide) for a sale. */
export function SaleOutcome({ o, previewing = false }: { o: OrderRecord; previewing?: boolean }) {
  const s = o.statement;
  const counts = o.classification === "NEW" || o.classification === "RESIDUAL";
  return (
    <div className="grid gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Pill value={o.classification ?? o.status} label={o.classification ?? (o.status === "awaiting_payment" ? "awaiting payment" : o.status)} />
        {o.customer_is_new && <span className="text-xs text-muted-foreground">New customer {o.customer.public_id}</span>}
        {o.flags?.map((f) => (
          <Pill key={f} value="EXCLUDED" label={f.replace(/_/g, " ")} />
        ))}
      </div>
      {counts ? (
        <p>
          {o.classification === "NEW" ? "New customer" : "Returning customer"} —{" "}
          {o.classification === "NEW" ? "referred by" : "residual to"} <strong className="text-primary">{o.partner_name}</strong>.{" "}
          {pct(o.commission_bps)} = <strong>{money(o.commission_cents)}</strong> estimated commission.
        </p>
      ) : o.classification === "EXCLUDED" ? (
        <p>Excluded from ambassador revenue{o.flags?.includes("self_purchase") ? " — the customer is the ambassador" : ""}. No commission.</p>
      ) : o.classification === "UNATTRIBUTED" ? (
        <p>No active ambassador for this customer. No commission.</p>
      ) : (
        <p>
          Not paid yet — nothing counts until payment is confirmed.
          {o.partner_name ? ` It will belong to ${o.partner_name}.` : ""}
        </p>
      )}
      {counts && s && (
        <p className="text-xs text-muted-foreground">
          {o.partner_name}'s {previewing ? "month would become" : "month is now"}: {money(s.qualified_cents)} qualified ·{" "}
          {s.tier_name} ({pct(s.tier_bps)})
          {o.before && o.before.tier_name !== s.tier_name ? ` — up from ${o.before.tier_name}` : ""} · {money(s.final_cents)} total
          commission this month.
        </p>
      )}
    </div>
  );
}
