import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, FlaskConical } from "lucide-react";

import { getProductBySlug, products, usd, MAX_PRICED_QTY, RESEARCH_DISCLAIMER, type Variant } from "@/data/products";
import { ProductCard } from "@/components/product-card";
import { ContactCta } from "@/components/contact-cta";
import { ProductVial } from "@/components/product-vial";
import { StatusBadge } from "@/components/status-badge";
import { ProductSchema } from "@/components/structured-data";
import { AvailabilityNotify } from "@/components/availability-notify";
import { OrderForm } from "@/components/order-form";

const badges = [
  { icon: FlaskConical, label: "Research Use Only" },
  { icon: FileText, label: "COA Requests Welcome" },
];

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product not found — Natural State Peptides" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.product.name} — Natural State Peptides`;
    const description = loaderData.product.shortDescription;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const [sku, setSku] = useState(product.variants[0].sku);
  const variant = product.variants.find((v) => v.sku === sku) ?? product.variants[0];
  const orderable = variant.status === "In Stock";
  const related = products.filter((p) => p.slug !== product.slug).slice(0, 4);

  const sections = [
    { title: "Product Overview", body: product.longDescription },
    { title: "Research Information", body: product.researchNotes },
    { title: "Testing & Documentation", body: product.testingStatus },
    { title: "Storage Information", body: product.storage },
  ];

  return (
    <>
      <ProductSchema product={product} />
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <Link
            to="/catalog"
            className="text-sm text-muted-foreground transition-colors hover:text-accent"
          >
            ← Back to catalog
          </Link>

          <div className="mt-8 grid gap-12 pb-16 lg:grid-cols-2 lg:items-start">
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
              <ProductVial product={product} strength={variant.strength} eager />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-4">
                <p className="eyebrow">{product.category}</p>
                <StatusBadge status={variant.status} />
              </div>
              <h1 className="mt-4 font-serif text-5xl text-primary sm:text-6xl">{product.name}</h1>
              {product.variants.length > 1 ? (
                <div role="radiogroup" aria-label="Strength" className="mt-4 flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.sku}
                      type="button"
                      role="radio"
                      aria-checked={v.sku === variant.sku}
                      onClick={() => setSku(v.sku)}
                      className={
                        "rounded-md border px-5 py-2.5 text-sm transition-colors " +
                        (v.sku === variant.sku
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary/25 text-primary hover:border-accent")
                      }
                    >
                      {v.strength}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-base text-muted-foreground">{product.strength}</p>
              )}
              <p className="mt-6 max-w-lg text-base leading-relaxed text-foreground/75">
                {product.shortDescription}
              </p>
              <PricePanel variant={variant} />

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {badges.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm text-primary"
                  >
                    <Icon className="size-4 shrink-0 text-accent" strokeWidth={1.4} />
                    {label}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {orderable && (
                  <a
                    href="#order"
                    className="inline-flex justify-center rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Place Order
                  </a>
                )}
                <Link
                  to="/contact"
                  search={{ product: product.slug, intent: "product" }}
                  className={
                    orderable
                      ? "inline-flex justify-center rounded-md border border-primary/25 px-7 py-3.5 text-sm text-primary transition-colors hover:border-accent"
                      : "inline-flex justify-center rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
                  }
                >
                  {!orderable
                    ? "Ask About Availability"
                    : "Inquire About This Product"}
                </Link>
                <Link
                  to="/contact"
                  search={{ product: product.slug, intent: "coa" }}
                  className="inline-flex justify-center rounded-md border border-primary/25 px-7 py-3.5 text-sm text-primary transition-colors hover:border-accent"
                >
                  Request COA
                </Link>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Documentation is shared upon request, where available. Ask us to confirm the report
                source and applicable lot.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
        <div className="grid gap-12">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="font-serif text-3xl text-primary">{s.title}</h2>
              <div className="rule-gold mt-4" />
              <p className="mt-5 text-base leading-relaxed text-foreground/75">{s.body}</p>
            </div>
          ))}
        </div>

        {!orderable && <AvailabilityNotify product={product} />}
        {orderable && (
          <div className="mt-16">
            {/* Keyed so switching strength above pre-selects it in the form. */}
            <OrderForm key={variant.sku} initialProduct={variant.sku} />
          </div>
        )}

        <div className="mt-16 rounded-lg border border-border bg-secondary/50 p-7">
          <p className="text-[0.68rem] tracking-[0.22em] text-accent uppercase">Disclaimer</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">{RESEARCH_DISCLAIMER}</p>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <h2 className="font-serif text-3xl text-primary">Related Products</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <ContactCta />
    </>
  );
}

function PricePanel({ variant }: { variant: Variant }) {
  const p = variant.prices;
  return (
    <div className="mt-6 max-w-lg rounded-lg border border-border bg-card p-5 shadow-soft">
      <p className="text-[0.68rem] tracking-[0.22em] text-accent uppercase">Price · {variant.strength}</p>
      {p ? (
        <>
          <dl className="mt-4 grid grid-cols-3 divide-x divide-border text-center">
            {p.map((price, i) => {
              const save = p[0] * (i + 1) - price;
              return (
                <div key={i} className="px-2">
                  <dt className="text-xs text-muted-foreground">
                    {i + 1} vial{i ? "s" : ""}
                  </dt>
                  <dd className="mt-1 font-serif text-2xl text-primary tabular-nums sm:text-3xl">{usd(price)}</dd>
                  {save > 0 && <dd className="mt-0.5 text-[0.7rem] text-accent">save {usd(save)}</dd>}
                </div>
              );
            })}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            More than {MAX_PRICED_QTY} vials? We'll quote you. Payment is arranged directly — cash, Cash App,
            Venmo or crypto. Local pickup or delivery in the Hot Springs, Arkansas area.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Pricing will be posted when this becomes available.</p>
      )}
    </div>
  );
}
