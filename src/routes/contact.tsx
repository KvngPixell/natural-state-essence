import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Facebook, MapPin } from "lucide-react";

import bannerImage from "@/assets/contact-banner.jpg";
import { getProductBySlug, products } from "@/data/products";
import { FACEBOOK_URL } from "@/components/site-footer";

const title = "Contact — Natural State Peptides";
const description =
  "Contact Natural State Peptides with product inquiries, testing documentation requests, partnership questions, or general questions.";

export const Route = createFileRoute("/contact")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { product?: string | undefined; intent?: "coa" | "product" | "partnership" | undefined } => ({
    product:
      typeof search["product"] === "string" && getProductBySlug(search["product"])
        ? search["product"]
        : undefined,
    intent:
      search["intent"] === "coa" ||
      search["intent"] === "product" ||
      search["intent"] === "partnership"
        ? search["intent"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ContactPage,
});

const faqs = [
  {
    q: "Where can I find product testing information?",
    a: "Use Request COA on a product page to prepare a documentation inquiry. Reports are shared upon request, where available; ask about the report source and applicable lot.",
  },
  {
    q: "How quickly do you respond?",
    a: "Including the product name in your message helps us respond more efficiently.",
  },
  {
    q: "Can I inquire about partnerships or ambassador opportunities?",
    a: "Yes. Choose Partnership inquiry below and tell us about your interest before sending your message on Facebook.",
  },
];

function ContactPage() {
  const search = Route.useSearch();
  const [productSlug, setProductSlug] = useState(search.product ?? "");
  const [intent, setIntent] = useState(search.intent ?? "product");
  const [lot, setLot] = useState("");
  const [notes, setNotes] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    setProductSlug(search.product ?? "");
    setIntent(search.intent ?? "product");
    setLot("");
    setCopyStatus("idle");
  }, [search.product, search.intent]);

  const product = getProductBySlug(productSlug);
  const topic =
    intent === "coa"
      ? "COA request"
      : intent === "partnership"
        ? "Partnership inquiry"
        : "Product inquiry";
  const draft = [
    `Hello Natural State Peptides — ${topic.toLowerCase()}.`,
    product ? `Product: ${product.name} (${product.strength})` : "",
    lot.trim() ? `Lot reference: ${lot.trim()}` : "",
    intent === "coa"
      ? "Please share any available documentation and confirm the report source, laboratory, and applicable lot."
      : intent === "partnership"
        ? "I'd like to learn more about partnership opportunities."
        : "Please let me know about current availability and product information.",
    notes.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  async function copyInquiry() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  const fieldClass =
    "mt-2 w-full rounded-md border border-border bg-card px-4 py-3 text-base text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent";

  return (
    <>
      <section className="relative isolate border-b border-border">
        <img
          src={bannerImage}
          alt="Calm Arkansas lake at dawn"
          width={1920}
          height={720}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-background/75" />
        <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <p className="eyebrow">Natural State Peptides</p>
          <h1 className="mt-5 font-serif text-5xl text-primary sm:text-6xl">Get in Touch</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-foreground/75">
            Questions, product inquiries, partnerships, or testing documentation? We'd be happy to
            hear from you.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-16 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1fr]">
        <div>
          <h2 className="font-serif text-4xl text-primary">Contact Natural State Peptides</h2>
          <div className="rule-gold mt-5" />

          <ul className="mt-9 space-y-6">
            <li className="flex gap-4">
              <Facebook className="mt-1 size-4 shrink-0 text-accent" strokeWidth={1.4} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">Message us on Facebook</p>
                <p className="text-sm text-muted-foreground">
                  All inquiries are handled through our Facebook page at this time.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <MapPin className="mt-1 size-4 shrink-0 text-accent" strokeWidth={1.4} />
              <div>
                <p className="text-sm font-medium text-primary">Location</p>
                <p className="text-sm text-muted-foreground">Arkansas, USA</p>
              </div>
            </li>
          </ul>

          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-9 inline-flex items-center gap-2 rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Facebook className="size-4" strokeWidth={1.5} />
            Message us on Facebook
          </a>

          <div className="mt-8 rounded-lg border border-border bg-secondary/50 p-6">
            <p className="text-sm leading-relaxed text-foreground/75">
              For product-specific inquiries, include the product name in your message so we can
              respond more efficiently.
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-card p-7 shadow-soft sm:p-9">
          <p className="eyebrow">Prepare your inquiry</p>
          <h2 className="mt-3 font-serif text-3xl text-primary">A clear starting point</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Choose your topic, copy the message, then paste and send it through our Facebook page.
            Nothing is sent from this page.
          </p>
          <div className="mt-7 grid gap-5" onChange={() => setCopyStatus("idle")}>
            <label htmlFor="inquiry-topic" className="text-sm text-primary">
              Inquiry type
              <select
                id="inquiry-topic"
                value={intent}
                onChange={(e) => setIntent(e.target.value as typeof intent)}
                className={fieldClass}
              >
                <option value="product">Product inquiry</option>
                <option value="coa">COA request</option>
                <option value="partnership">Partnership inquiry</option>
              </select>
            </label>
            <label htmlFor="product" className="text-sm text-primary">
              Product of interest (optional)
              <select
                id="product"
                value={productSlug}
                onChange={(e) => {
                  setProductSlug(e.target.value);
                  setLot("");
                }}
                className={fieldClass}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} — {p.strength}
                  </option>
                ))}
              </select>
            </label>
            {intent === "coa" && (
              <label htmlFor="lot" className="text-sm text-primary">
                Lot reference (if available)
                <input
                  id="lot"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  maxLength={100}
                  className={fieldClass}
                />
              </label>
            )}
            <label htmlFor="notes" className="text-sm text-primary">
              Your questions (optional)
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                className={fieldClass}
              />
            </label>
            <label htmlFor="inquiry-draft" className="text-sm text-primary">
              Your message
              <textarea
                id="inquiry-draft"
                readOnly
                value={draft}
                rows={9}
                className={`${fieldClass} bg-secondary/30`}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button
              type="button"
              onClick={copyInquiry}
              className="rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground hover:opacity-90"
            >
              {copyStatus === "copied" ? "Copied — ready to paste" : "1. Copy inquiry"}
            </button>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-md border border-primary/25 px-7 py-3.5 text-center text-sm text-primary hover:border-accent"
            >
              2. Open Facebook to send
            </a>
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {copyStatus === "copied"
                ? "Copied, not sent. Open our Facebook page, choose Message, then paste and send your inquiry."
                : copyStatus === "failed"
                  ? "Automatic copying is unavailable. Select and copy the message above, then paste it into a Facebook message."
                  : "Facebook opens in a new tab. You may need to sign in to send a message."}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-4 font-serif text-4xl text-primary">Common questions</h2>
          <div className="mt-9 divide-y divide-border border-y border-border">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="cursor-pointer list-none text-base text-primary marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {f.q}
                    <span className="text-accent transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-foreground/75">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
