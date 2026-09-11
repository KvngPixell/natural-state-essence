import { useState } from "react";
import type { Product } from "@/data/products";
import { usePortal } from "@/components/portal-context";
import { backendReady, edge, field, button } from "@/lib/backend";
import { visitorId } from "@/lib/referral";

/**
 * Compact capture for Coming Soon products. Without this, a Coming Soon page is
 * a dead end: someone interested has nothing to do but leave. Submits through
 * the same edge function as the full inquiry form, recorded as an
 * "availability" request so these are filterable in owner controls.
 */
export function AvailabilityNotify({ product }: { product: Product }) {
  const { referral, referralCaptured } = usePortal();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!backendReady) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await edge({
        action: "submit",
        request: {
          id: crypto.randomUUID(),
          kind: "availability",
          name: name.trim(),
          first_name: name.trim().split(/\s+/)[0] ?? name.trim(),
          last_name: name.trim().split(/\s+/).slice(1).join(" ") || null,
          email: email.trim(),
          product: `${product.name} ${product.strength}`,
          message: `Please let me know when ${product.name} ${product.strength} becomes available.`,
          referral_code: referral.toUpperCase().trim() || null,
          referral_captured: referralCaptured,
          visitor_id: visitorId() || null,
          website,
        },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 rounded-lg border border-border bg-card p-6">
      <p className="text-[0.68rem] tracking-[0.22em] text-accent uppercase">Not yet available</p>
      <h2 className="mt-2 font-serif text-2xl text-primary">
        Tell me when {product.name} arrives
      </h2>

      {sent ? (
        <p role="status" className="mt-4 text-sm leading-relaxed text-foreground/75">
          Noted — we have your request for {product.name} {product.strength} and will be in touch
          when it is available. Nothing else is needed from you.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Your name
              <input
                id={`notify-name-${product.slug}`}
                required
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
                id={`notify-email-${product.slug}`}
                required
                type="email"
                maxLength={254}
                autoComplete="email"
                className={field}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
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
          <button className={button + " w-fit"} disabled={busy}>
            {busy ? "Saving…" : "Notify me"}
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We use this only to answer your availability question. It does not subscribe you to
            marketing.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
