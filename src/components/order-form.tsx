import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { products, getProductBySlug } from "@/data/products";
import { usePortal } from "@/components/portal-context";
import { backendReady, edge, field, button, outline, errorText, PAYMENT_METHODS } from "@/lib/backend";
import { checkCode, visitorId } from "@/lib/referral";

/**
 * Order request. Natural State does not take payment on the site: this sends
 * the owner what the customer wants, how many, how they intend to pay, and
 * whether they want shipping or pickup. The owner confirms availability and
 * total, arranges payment directly, and records the sale once it is paid.
 */
const inStock = products.filter((p) => p.status === "In Stock");

interface Line {
  slug: string;
  quantity: number;
}

export function OrderForm({ initialProduct = "" }: { initialProduct?: string }) {
  const { referral, referralCaptured } = usePortal();
  const firstSlug = getProductBySlug(initialProduct)?.status === "In Stock" ? initialProduct : (inStock[0]?.slug ?? "");
  const [lines, setLines] = useState<Line[]>([{ slug: firstSlug, quantity: 1 }]);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState("");
  const [paymentOther, setPaymentOther] = useState("");
  const [fulfil, setFulfil] = useState<"ship" | "pickup">("ship");
  const [notes, setNotes] = useState("");
  const [ack, setAck] = useState(false);
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<"" | "valid" | "invalid">("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [requestId] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : ""));

  if (!backendReady || inStock.length === 0) return null;

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const usedSlugs = new Set(lines.map((l) => l.slug));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!payment) return setError("Choose how you plan to pay.");
    if (payment === "other" && !paymentOther.trim()) return setError("Tell us which payment method you'd like to use.");
    if (!ack) return setError("Please confirm the research-use statement.");
    const items = lines
      .map((l) => ({ l, p: getProductBySlug(l.slug) }))
      .filter((x) => x.p)
      .map(({ l, p }) => ({ slug: p!.slug, name: `${p!.name} ${p!.strength}`, quantity: l.quantity }));
    if (items.length === 0) return setError("Add at least one product.");
    const effectiveCode = referralCaptured ? referral : code.trim().toUpperCase();
    const summary = items.map((i) => `${i.quantity} × ${i.name}`).join("\n");
    const payLabel = PAYMENT_METHODS.find((m) => m.value === payment)?.label ?? payment;
    setBusy(true);
    try {
      const result = await edge({
        action: "submit",
        request: {
          id: requestId,
          kind: "order",
          first_name: first.trim(),
          last_name: last.trim() || null,
          name: [first.trim(), last.trim()].filter(Boolean).join(" "),
          email: email.trim(),
          phone: phone.trim(),
          product: items.length === 1 ? items[0].name : `${items.length} products`,
          order_items: items,
          payment_method: payment,
          payment_other: payment === "other" ? paymentOther.trim() : null,
          fulfillment_method: fulfil,
          research_ack: true,
          message: [
            "Order request:",
            summary,
            `Payment: ${payLabel}${payment === "other" ? " (" + paymentOther.trim() + ")" : ""}`,
            `Fulfilment: ${fulfil === "pickup" ? "Local pickup" : "Ship"}`,
            notes.trim() ? "Notes: " + notes.trim() : "",
          ]
            .filter(Boolean)
            .join("\n"),
          referral_code: effectiveCode || null,
          referral_captured: referralCaptured,
          visitor_id: visitorId() || null,
          website,
        },
      });
      setDone(String(result.id).slice(0, 8).toUpperCase());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div id="order" className="scroll-mt-24 rounded-lg border border-border bg-card p-6 sm:p-8">
        <p className="text-[0.68rem] tracking-[0.22em] text-accent uppercase">Order request received</p>
        <h2 className="mt-2 font-serif text-3xl text-primary">Thank you, {first.trim()}.</h2>
        <p className="mt-4 text-sm leading-relaxed text-foreground/75">
          Your request <strong>#{done}</strong> is with our team. We'll confirm availability and your
          total, then contact you by phone or email to arrange {PAYMENT_METHODS.find((m) => m.value === payment)?.label}
          {fulfil === "pickup" ? " and local pickup" : " and shipping"}. Nothing has been charged, and
          nothing is final until we confirm it with you.
        </p>
      </div>
    );
  }

  return (
    <div id="order" className="scroll-mt-24 rounded-lg border border-border bg-card p-6 shadow-soft sm:p-8">
      <p className="text-[0.68rem] tracking-[0.22em] text-accent uppercase">Place an order</p>
      <h2 className="mt-2 font-serif text-3xl text-primary">Request an order</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Tell us what you need. We confirm availability and your total, then arrange payment with you
        directly. No payment is taken on this site.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-6">
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium text-primary">Products</legend>
          {lines.map((l, i) => (
            <div key={i} className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <select
                aria-label={`Product ${i + 1}`}
                className={field + " min-w-0 flex-1 basis-full sm:basis-auto"}
                value={l.slug}
                onChange={(e) => setLine(i, { slug: e.target.value })}
              >
                {inStock.map((p) => (
                  <option key={p.slug} value={p.slug} disabled={p.slug !== l.slug && usedSlugs.has(p.slug)}>
                    {p.name} — {p.strength}
                  </option>
                ))}
              </select>
              <div className="flex items-center rounded-lg border border-border bg-background">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="p-3 text-primary disabled:opacity-40"
                  disabled={l.quantity <= 1}
                  onClick={() => setLine(i, { quantity: Math.max(1, l.quantity - 1) })}
                >
                  <Minus className="size-4" />
                </button>
                <input
                  aria-label={`Quantity for product ${i + 1}`}
                  inputMode="numeric"
                  className="w-12 bg-transparent text-center text-base outline-none"
                  value={l.quantity}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                    setLine(i, { quantity: Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : 1 });
                  }}
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="p-3 text-primary disabled:opacity-40"
                  disabled={l.quantity >= 100}
                  onClick={() => setLine(i, { quantity: Math.min(100, l.quantity + 1) })}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {lines.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove product"
                  className="rounded-lg border border-border p-3 text-muted-foreground hover:text-destructive"
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {lines.length < Math.min(20, inStock.length) && (
            <button
              type="button"
              className={outline + " w-fit"}
              onClick={() =>
                setLines((ls) => [...ls, { slug: inStock.find((p) => !usedSlugs.has(p.slug))?.slug ?? inStock[0].slug, quantity: 1 }])
              }
            >
              <Plus className="size-4" /> Add another product
            </button>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-primary">How do you plan to pay?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.value}
                className={
                  "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-center text-sm transition-colors " +
                  (payment === m.value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-accent")
                }
              >
                <input
                  type="radio"
                  name="payment"
                  value={m.value}
                  checked={payment === m.value}
                  onChange={() => setPayment(m.value)}
                  className="sr-only"
                />
                {m.label}
              </label>
            ))}
          </div>
          {payment === "other" && (
            <input
              aria-label="Other payment method"
              placeholder="Which method?"
              maxLength={100}
              className={field + " mt-3"}
              value={paymentOther}
              onChange={(e) => setPaymentOther(e.target.value)}
            />
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-primary">Shipping or pickup</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["ship", "Ship to me", "USPS with tracking, US only"],
                ["pickup", "Local pickup", "Arkansas — we'll arrange a time"],
              ] as const
            ).map(([v, label, sub]) => (
              <label
                key={v}
                className={
                  "flex cursor-pointer flex-col rounded-lg border px-4 py-3 text-sm transition-colors " +
                  (fulfil === v ? "border-primary bg-secondary/60" : "border-border hover:border-accent")
                }
              >
                <input type="radio" name="fulfil" value={v} checked={fulfil === v} onChange={() => setFulfil(v)} className="sr-only" />
                <span className="font-medium text-primary">{label}</span>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            First name
            <input required maxLength={60} autoComplete="given-name" className={field} value={first} onChange={(e) => setFirst(e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm">
            Last name
            <input maxLength={60} autoComplete="family-name" className={field} value={last} onChange={(e) => setLast(e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm">
            Email
            <input required type="email" maxLength={254} autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm">
            Phone
            <input required type="tel" maxLength={40} autoComplete="tel" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>

        <label className="grid gap-2 text-sm">
          Notes (optional)
          <textarea rows={3} maxLength={1000} className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {!referralCaptured && (
          <label className="grid gap-2 text-sm">
            Referral code (optional)
            <input
              className={field}
              maxLength={32}
              pattern="[A-Za-z0-9_-]*"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCodeState("");
              }}
              onBlur={async () => {
                if (!code.trim()) return setCodeState("");
                setCodeState((await checkCode(code)) ? "valid" : "invalid");
              }}
            />
            {codeState === "valid" && <span className="text-xs text-primary">Referral code applied.</span>}
            {codeState === "invalid" && <span className="text-xs text-destructive">We couldn't find that code.</span>}
          </label>
        )}

        <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed">
          <input type="checkbox" className="mt-1 size-4 shrink-0" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>
            I understand these products are sold strictly for laboratory research use and are not for
            human or animal consumption, diagnostic, or therapeutic use.
          </span>
        </label>

        <div className="hidden" aria-hidden="true">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button className={button + " w-full sm:w-fit"} disabled={busy}>
          {busy ? "Sending…" : "Send order request"}
        </button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          We use these details only to confirm and fulfil your order. This does not subscribe you to marketing.
        </p>
      </form>
    </div>
  );
}
