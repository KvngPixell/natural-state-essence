import { Link } from "@tanstack/react-router";
import hero from "@/assets/hero-arkansas.jpg";
import arkansasHero from "@/assets/arkansas-hero.webp";
import { products } from "@/data/products";
import { ProductVial } from "@/components/product-vial";
import { button, outline, panel } from "@/lib/backend";
import { FaqSchema } from "@/components/structured-data";
const faq = [
  [
    "How do I request a COA?",
    "Choose Request COA on a product page, or use the Quality & Testing page. Include the product, strength, and a lot reference if you have one. Documentation is shared upon request, where available.",
  ],
  [
    "How do I place an order?",
    "Send an inquiry through the contact page with the product and strength you need. A member of the team responds directly to arrange the next step. Orders are not processed automatically through this website.",
  ],
  [
    "Which products are available?",
    "The current collection below shows products marked In Stock. The full catalog also includes Coming Soon products, which are listed so you can ask to be told when they arrive.",
  ],
  [
    "What does Coming Soon mean?",
    "The product is part of our catalog but is not currently available to supply. Send an availability inquiry and we will tell you what we know about timing.",
  ],
  [
    "Can these products be used by people or animals?",
    "No. Everything in this catalog is supplied for laboratory research use only. Nothing here is a drug, supplement, or cosmetic, and nothing is supplied for human or animal consumption, diagnosis, or treatment. We do not provide dosing or administration guidance of any kind.",
  ],
  [
    "How should material be stored?",
    "Lyophilised material should be kept refrigerated at 2–8°C, protected from light and moisture, and handled according to standard laboratory practice.",
  ],
  [
    "How does shipping work?",
    "Local pickup is available in Arkansas. Shipped orders go out from Hot Springs, Arkansas, normally within 72 hours of the order being confirmed, by USPS with tracking. We ship within the United States only at this time.",
  ],
  [
    "What if something arrives damaged or wrong?",
    "All sales are final, but that does not cover our own mistakes. If material arrives damaged, or the wrong product or strength is supplied, contact us within 7 days of delivery and we will replace it. Full detail is on the Terms page.",
  ],
  [
    "How do I contact the team?",
    "Use the inquiry page for product information, availability, or documentation questions. Facebook messaging is also available.",
  ],
  [
    "Can I become an ambassador?",
    "Apply through our partner page. Approved partners receive account access and individual written terms before any commissions are approved.",
  ],
];
export function HomePage() {
  const available = products.filter((p) => p.status === "In Stock");
  return (
    <>
      <FaqSchema items={faq} />
      <section className="relative isolate overflow-hidden border-b border-border">
        <img
          src={hero}
          alt=""
          className="absolute inset-0 -z-20 size-full object-cover"
          width={1920}
          height={1088}
        />
        {/* Scrim over the Arkansas photo. Lighter on the left where the headline
            sits, so the landscape stays visible without costing legibility. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/92 via-background/82 to-background/70" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:py-12">
          <div>
            <p className="eyebrow">From the Natural State</p>
            <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[1.02] text-primary sm:text-6xl lg:text-7xl">
              Rooted in the
              <br />
              Natural State.
            </h1>
            <p className="mt-4 max-w-xl font-serif text-2xl italic text-primary/85 sm:text-3xl">
              Research compounds. A clear next step.
            </p>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/75">
              Explore the catalog. Check availability.
              <br />
              Request product documentation.
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
          {/* Floats on the page rather than sitting in a card: the artwork carries
              its own gold frame, so a second border around it reads as a sticker. */}
          {/* Visible at every width. QR traffic lands on phones, and hiding the
              single most distinctive asset from most first-time visitors would
              waste it. Scales down rather than disappearing. */}
          <div className="flex justify-center">
            <img
              src={arkansasHero}
              alt="The state of Arkansas rendered as a gold-framed window onto a sunrise over forested ridges and a river"
              className="w-full max-w-[15rem] drop-shadow-[0_24px_40px_rgba(8,39,25,0.22)] sm:max-w-[19rem] lg:max-w-[26rem]"
              width={900}
              height={1139}
              loading="eager"
            />
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
        <div className="mt-9 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((p) => (
            <article
              key={p.id}
              className="group flex items-center gap-5 border-border sm:not-first:border-l sm:not-first:pl-8 lg:[&:nth-child(3n+1)]:border-l-0 lg:[&:nth-child(3n+1)]:pl-0"
            >
              <div className="w-24 shrink-0 sm:w-28">
                <ProductVial product={p} />
              </div>
              <div className="min-w-0">
                {/* Long blend names would otherwise run to three lines and break
                    the row's shared baseline, so they step down a size. */}
                <h3
                  className={`font-serif leading-tight text-primary ${
                    p.name.length > 18 ? "text-lg" : "text-2xl"
                  }`}
                >
                  {p.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.strength}</p>
                <div className="rule-gold mt-3" />
                <Link
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4 transition-colors group-hover:text-accent"
                >
                  View Product <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
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
