import { useEffect, useState } from "react";
import { products, getProductBySlug } from "@/data/products";
import { FACEBOOK_URL } from "@/components/site-footer";
import { usePortal } from "@/components/portal-context";
import { backendReady, edge, field, button, outline } from "@/lib/backend";
export function InquiryForm({
  initialProduct = "",
  initialKind = "product",
}: {
  initialProduct?: string;
  initialKind?: string;
}) {
  const { referral } = usePortal();
  const [product, setProduct] = useState(initialProduct);
  const [kind, setKind] = useState(initialKind);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lot, setLot] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState(referral);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [requestId, setRequestId] = useState("");
  useEffect(() => {
    setProduct(initialProduct);
    setKind(initialKind);
    setLot("");
    setSent(false);
    setStatus("");
    setRequestId("");
  }, [initialProduct, initialKind]);
  useEffect(() => {
    setCode(referral);
  }, [referral]);
  const p = getProductBySlug(product);
  const draft = [
    "Hello Natural State Peptides.",
    kind === "coa"
      ? "I'd like to request available documentation and confirm the report source and applicable lot."
      : kind === "application"
        ? "I'd like to apply to the ambassador program."
        : "I'd like product information and availability.",
    p ? p.name + " — " + p.strength : "",
    kind === "coa" && lot ? "Lot: " + lot : "",
    code ? "Referral: " + code : "",
    name ? "Name: " + name : "",
    email ? "Reply: " + email : "",
    message,
  ]
    .filter(Boolean)
    .join("\n\n");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    try {
      const result = await edge({
        action: "submit",
        request: {
          id,
          kind,
          name: name.trim(),
          email: email.trim(),
          product: p ? p.name + " " + p.strength : null,
          lot: kind === "coa" ? lot : null,
          message: message.trim() || draft,
          referral_code: code.toUpperCase().trim(),
          website,
        },
      });
      setSent(true);
      setStatus(
        "Request received. Reference: " + result.id + ". Your request is saved for our team.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setStatus("Copied, not sent. Open Facebook, choose Message, then paste and send.");
    } catch {
      setStatus("Select and copy the message below, then paste it in Facebook.");
    }
  }
  return (
    <div className="min-w-0">
      <form
        onSubmit={submit}
        className="grid gap-5"
        onChange={() => {
          setSent(false);
          setRequestId("");
          setStatus("");
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            Your name
            <input
              required={backendReady}
              maxLength={100}
              autoComplete="name"
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Reply email
            <input
              required={backendReady}
              type="email"
              maxLength={254}
              autoComplete="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm">
          Inquiry type
          <select className={field} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="product">Product inquiry</option>
            <option value="coa">COA request</option>
            <option value="application">Ambassador application</option>
            <option value="availability">Availability inquiry</option>
          </select>
        </label>
        {kind !== "application" && (
          <label className="grid gap-2 text-sm">
            Product
            <select
              id="product"
              className={field}
              value={product}
              onChange={(e) => {
                setProduct(e.target.value);
                setLot("");
              }}
            >
              <option value="">Select a product (optional)</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} — {p.strength}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === "coa" && (
          <label className="grid gap-2 text-sm">
            Lot reference, if available
            <input
              className={field}
              maxLength={100}
              value={lot}
              onChange={(e) => setLot(e.target.value)}
            />
          </label>
        )}
        <label className="grid gap-2 text-sm">
          {kind === "application"
            ? "Your public channels, audience and how you would represent the brand"
            : "Your question"}
          <textarea
            required={kind === "application"}
            rows={4}
            maxLength={3000}
            className={field}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm">
          Referral code (optional)
          <input
            className={field}
            maxLength={32}
            pattern="[A-Za-z0-9_-]*"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </label>
        <div className="hidden" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>
        {backendReady && (
          <button className={button} disabled={busy || sent}>
            {busy ? "Saving request…" : sent ? "Request received" : "Send request"}
          </button>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {backendReady
            ? "We use these details to respond to your request. This does not subscribe you to marketing."
            : "Prepare your inquiry here, then copy and send it through our Facebook page. Nothing is sent automatically."}
        </p>
      </form>
      <div role="status" aria-live="polite" className="my-4 break-words text-sm text-primary">
        {status}
      </div>
      <details className="mt-5 border-t border-border pt-5" open={!backendReady}>
        <summary className="cursor-pointer text-sm font-medium text-primary">
          {backendReady ? "Prefer to message us on Facebook?" : "Send your inquiry on Facebook"}
        </summary>
        <textarea
          id="inquiry-draft"
          aria-label="Message to copy"
          readOnly
          value={draft}
          rows={6}
          className={field + " mt-4"}
          onFocus={(e) => e.target.select()}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={outline} onClick={copy}>
            1. Copy inquiry
          </button>
          <a href={FACEBOOK_URL} target="_blank" rel="noreferrer noopener" className={outline}>
            2. Open Facebook to send
          </a>
        </div>
      </details>
    </div>
  );
}
