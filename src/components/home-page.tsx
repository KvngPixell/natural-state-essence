import { Link } from "@tanstack/react-router";
import hero from "@/assets/hero-arkansas.jpg";
import { products } from "@/data/products";
import { ProductVial } from "@/components/product-vial";
import { ProductCard } from "@/components/product-card";
import { button, outline, panel } from "@/lib/backend";
const faq = [
  [
    "How do I request a COA?",
    "Choose Request COA on a product page. Include a lot reference if you have one. Documentation is shared upon request, where available.",
  ],
  [
    "Which products are available?",
    "The current collection below shows products marked In Stock. The full catalog also includes Coming Soon products.",
  ],
  [
    "How do I contact the team?",
    "Use the inquiry page for product information, availability or documentation questions. Facebook messaging is also available.",
  ],
  [
    "Can I become an ambassador?",
    "Apply through our partner page. Approved partners receive account access and individual terms before commissions are approved.",
  ],
];
export function HomePage() {
  const available = products.filter((p) => p.status === "In Stock");
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border">
        <img
          src={hero}
          alt=""
          className="absolute inset-0 -z-20 size-full object-cover"
          width={1920}
          height={1088}
        />
        <div className="absolute inset-0 -z-10 bg-background/90" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:py-12">
          <div>
            <p className="eyebrow">From the Natural State</p>
            <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[1.02] text-primary sm:text-6xl lg:text-7xl">
              Research compounds.
              <br />
              <span className="italic">A clear next step.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/75">
              Explore Natural State’s current catalog, check availability, and request the
              documentation available for your product.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#in-stock" className={button}>
                Browse In-Stock
              </a>
              <Link to="/quality" className={outline}>
                Request COA
              </Link>
            </div>
            <p className="mt-6 text-xs tracking-wide text-muted-foreground">
              Arkansas-based · Laboratory research only · Documentation upon request
            </p>
          </div>
          <div className="hidden max-h-[430px] overflow-hidden rounded-[2rem] border border-accent/20 shadow-soft lg:block">
            {available[0] && <ProductVial product={available[0]} eager className="-my-6" />}
          </div>
        </div>
      </section>
      <section id="in-stock" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Available now</p>
            <h2 className="mt-3 font-serif text-4xl text-primary">The current collection</h2>
          </div>
          <Link to="/catalog" className="text-sm underline underline-offset-4">
            Explore the full catalog →
          </Link>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {available.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-14 sm:px-8 md:grid-cols-3">
          {[
            [
              "01",
              "Explore the catalog",
              "Find product names, strengths and current availability.",
            ],
            [
              "02",
              "Request documentation",
              "Ask about the available report, its source and applicable lot.",
            ],
            [
              "03",
              "Contact the team",
              "Send a specific inquiry so we can help with the next step.",
            ],
          ].map(([n, title, copy]) => (
            <div key={n}>
              <p className="text-sm text-accent">{n}</p>
              <h2 className="mt-3 font-serif text-3xl">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2">
        <div className={panel}>
          <p className="eyebrow">Quality & Documentation</p>
          <h2 className="mt-4 font-serif text-4xl">Know what supports your research material.</h2>
          <p className="my-5 text-sm leading-relaxed text-muted-foreground">
            Request available documentation and ask how it relates to your product. Report source
            and applicable lot matter.
          </p>
          <Link to="/quality" className={button}>
            Explore documentation
          </Link>
        </div>
        <div className="flex flex-col justify-center p-6">
          <p className="eyebrow">Rooted in Arkansas</p>
          <h2 className="mt-4 font-serif text-4xl">
            A considered approach.
            <br />A recognizable home.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Natural State Peptides is an Arkansas-based research supplier. Our catalog brings
            product information, availability and documentation requests together in one place.
          </p>
          <Link to="/contact" className="mt-5 text-sm underline underline-offset-4">
            Get in touch →
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <p className="eyebrow">Useful answers</p>
        <h2 className="my-5 font-serif text-4xl">Before you inquire</h2>
        {faq.map(([q, a]) => (
          <details key={q} className="border-b border-border py-5">
            <summary className="cursor-pointer font-medium text-primary">{q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </section>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-12 sm:px-8">
          <div>
            <p className="text-xs tracking-[.2em] uppercase opacity-70">Natural State Partners</p>
            <h2 className="mt-3 font-serif text-4xl">Represent something distinctive.</h2>
          </div>
          <Link
            to="/ambassador"
            className="rounded-lg border border-primary-foreground/40 px-6 py-3 text-sm"
          >
            Explore the partner program →
          </Link>
        </div>
      </section>
    </>
  );
}
