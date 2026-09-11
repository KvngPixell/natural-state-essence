import { publicSite } from "@/lib/backend";
import type { Product } from "@/data/products";

const SITE = publicSite || "https://naturalstatepeptides.lovable.app";

/** Renders a JSON-LD block. Kept as a plain script tag so it server-renders. */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Brand entity + site search. Rendered once, sitewide. */
export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": SITE + "/#organization",
            name: "Natural State Peptides",
            url: SITE,
            description:
              "Arkansas-based supplier of laboratory research materials. Products are supplied for laboratory research use only and are not for human or animal consumption.",
            address: {
              "@type": "PostalAddress",
              addressRegion: "AR",
              addressCountry: "US",
            },
          },
          {
            "@type": "WebSite",
            "@id": SITE + "/#website",
            url: SITE,
            name: "Natural State Peptides",
            publisher: { "@id": SITE + "/#organization" },
          },
        ],
      }}
    />
  );
}

/**
 * Product entity plus its breadcrumb trail. Offers carry the published
 * single-vial prices; orders are arranged directly, not checked out online.
 */
export function ProductSchema({ product }: { product: Product }) {
  const url = SITE + "/product/" + product.slug;
  const priced = product.variants.filter((v) => v.prices);
  const singles = priced.map((v) => v.prices![0]);
  const offers = priced.length
    ? {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: Math.min(...singles),
        highPrice: Math.max(...singles),
        offerCount: priced.length,
        availability:
          product.status === "In Stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url,
      }
    : undefined;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            "@id": url + "#product",
            name: product.name,
            url,
            category: product.category,
            description:
              product.shortDescription +
              " Supplied for laboratory research use only; not for human or animal consumption.",
            brand: { "@type": "Brand", name: "Natural State Peptides" },
            ...(offers ? { offers } : {}),
            additionalProperty: [
              {
                "@type": "PropertyValue",
                name: "Strength",
                value: product.variants.map((v) => v.strength).join(", "),
              },
              {
                "@type": "PropertyValue",
                name: "Availability",
                value: product.status,
              },
              {
                "@type": "PropertyValue",
                name: "Intended use",
                value: "Laboratory research use only",
              },
            ],
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE },
              { "@type": "ListItem", position: 2, name: "Catalog", item: SITE + "/catalog" },
              { "@type": "ListItem", position: 3, name: product.name, item: url },
            ],
          },
        ],
      }}
    />
  );
}

/** FAQ entries for the homepage. Pass the same pairs shown on the page. */
export function FaqSchema({ items }: { items: readonly (readonly string[])[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((pair) => ({
          "@type": "Question",
          name: pair[0] ?? "",
          acceptedAnswer: { "@type": "Answer", text: pair[1] ?? "" },
        })),
      }}
    />
  );
}
