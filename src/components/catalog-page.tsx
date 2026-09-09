import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, FlaskConical, FileText, Leaf, Search } from "lucide-react";

import heroImage from "@/assets/hero-arkansas.jpg";
import { categoryFilters, products } from "@/data/products";
import { ProductCard } from "@/components/product-card";
import { ContactCta } from "@/components/contact-cta";

const trustItems = [
  {
    icon: FlaskConical,
    title: "Research Use Only",
    copy: "Supplied strictly for laboratory research applications.",
  },
  {
    icon: BadgeCheck,
    title: "Third-Party Tested",
    copy: "Independent testing documentation where available.",
  },
  {
    icon: Leaf,
    title: "High Purity",
    copy: "Quality-focused sourcing and handling standards.",
  },
  {
    icon: FileText,
    title: "Transparent COA Access",
    copy: "Documentation made available for each listed compound.",
  },
];

const qualityPoints = [
  "Third-Party Testing",
  "Purity Verification",
  "Transparent Documentation",
  "Quality-Focused Standards",
];

export function CatalogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All Products");
  const [sort, setSort] = useState("default");

  const visible = useMemo(() => {
    let list = products.filter((p) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchesCategory =
        category === "All Products" ||
        (category === "Featured" ? p.featured : p.category === category);
      return matchesQuery && matchesCategory;
    });

    list = [...list].sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      return a.sortOrder - b.sortOrder;
    });

    return list;
  }, [query, category, sort]);

  const fieldClass =
    "w-full rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent";

  return (
    <>
      {/* Hero */}
      <section className="relative isolate">
        <img
          src={heroImage}
          alt="Misty Arkansas forest and lake at sunrise"
          width={1920}
          height={1088}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-background/72" />
        <div className="mx-auto max-w-3xl px-5 py-28 text-center sm:px-8 sm:py-36">
          <p className="eyebrow fade-up">Natural State Peptides</p>
          <h1 className="fade-up mt-6 font-serif text-5xl leading-[1.05] text-primary sm:text-6xl lg:text-7xl">
            Our Research Peptides
          </h1>
          <p className="fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg">
            Explore high-purity research compounds with transparent third-party testing and
            quality-focused standards.
          </p>
          <div className="fade-up mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#catalog"
              className="rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Browse Catalog
            </a>
            <Link
              to="/contact"
              className="rounded-md border border-primary/25 px-7 py-3.5 text-sm text-primary transition-colors hover:border-accent hover:text-accent"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {trustItems.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex gap-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.4} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <p className="eyebrow">Current Catalog</p>
        <h2 className="mt-4 font-serif text-4xl text-primary sm:text-5xl">
          Explore the Collection
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/75">
          Browse our current research compounds and access available product information and
          testing documentation.
        </p>

        <div className="mt-12 grid gap-3 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="product-search" className="sr-only">
              Search products
            </label>
            <input
              id="product-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className={`${fieldClass} pl-11`}
            />
          </div>
          <div>
            <label htmlFor="category-filter" className="sr-only">
              Filter by category
            </label>
            <select
              id="category-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldClass}
            >
              {categoryFilters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sort-order" className="sr-only">
              Sort products
            </label>
            <select
              id="sort-order"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={fieldClass}
            >
              <option value="default">Sort: Featured order</option>
              <option value="name-asc">Name: A–Z</option>
              <option value="name-desc">Name: Z–A</option>
            </select>
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-sm text-muted-foreground">
            No products match your search. Try a different term or category.
          </p>
        )}
      </section>

      {/* Quality split section */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="rule-gold" />
            <h2 className="mt-7 font-serif text-4xl text-primary sm:text-5xl">
              Research with Confidence
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-foreground/75">
              Transparent testing, consistent quality standards, and accessible documentation
              support informed research decisions.
            </p>
            <Link
              to="/quality"
              className="mt-9 inline-flex rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              View Testing Information
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {qualityPoints.map((point) => (
              <li
                key={point}
                className="rounded-lg border border-border bg-card p-6 shadow-soft"
              >
                <BadgeCheck className="size-5 text-accent" strokeWidth={1.4} />
                <p className="mt-4 font-serif text-xl text-primary">{point}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ContactCta />
    </>
  );
}
