import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, FileText, FlaskConical, Leaf } from "lucide-react";

import { getProductBySlug, products, RESEARCH_DISCLAIMER } from "@/data/products";
import { ProductCard } from "@/components/product-card";
import { ContactCta } from "@/components/contact-cta";

const badges = [
  { icon: FlaskConical, label: "Research Use Only" },
  { icon: BadgeCheck, label: "Third-Party Tested" },
  { icon: Leaf, label: "High Purity" },
  { icon: FileText, label: "Transparent Results" },
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
        meta: [{ title: "Product not found — Natural State Peptides" }, { name: "robots", content: "noindex" }],
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
  const related = products.filter((p) => p.slug !== product.slug).slice(0, 4);

  const sections = [
    { title: "Product Overview", body: product.longDescription },
    {
      title: "Research Information",
      body: "Research information for this compound is listed as a placeholder. Verified references and handling notes will be published here as documentation becomes available.",
    },
    { title: "Testing & Documentation", body: product.testingStatus },
    { title: "Storage Information", body: product.storage },
  ];

  return (
    <>
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
              <img
                src={product.image}
                alt={`${product.name} research vial (placeholder image)`}
                width={1024}
                height={1024}
                className="aspect-square w-full object-cover"
              />
            </div>

            <div>
              <p className="eyebrow">{product.category}</p>
              <h1 className="mt-4 font-serif text-5xl text-primary sm:text-6xl">
                {product.name}
              </h1>
              <p className="mt-3 text-base text-muted-foreground">{product.strength}</p>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-foreground/75">
                {product.shortDescription}
              </p>

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

              <a
                href={product.coaUrl}
                className="mt-8 inline-flex rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
              >
                View COA
              </a>
              <p className="mt-3 text-xs text-muted-foreground">
                COA link placeholder — documentation to be added.
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

        <div className="mt-16 rounded-lg border border-border bg-secondary/50 p-7">
          <p className="text-[0.68rem] tracking-[0.22em] text-accent uppercase">Disclaimer</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">
            {RESEARCH_DISCLAIMER}
          </p>
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
