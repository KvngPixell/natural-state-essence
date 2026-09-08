import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="overflow-hidden bg-secondary/50">
        <img
          src={product.image}
          alt={`${product.name} research vial (placeholder image)`}
          loading="lazy"
          width={1024}
          height={1024}
          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-[0.65rem] tracking-[0.2em] text-accent uppercase">
          {product.category}
        </p>
        <h3 className="mt-2 font-serif text-2xl text-primary">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{product.strength}</p>
        <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/75">
          {product.shortDescription}
        </p>
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="mt-6 inline-flex w-fit border-b border-accent/60 pb-1 text-sm text-primary transition-colors hover:text-accent"
        >
          View Product
        </Link>
      </div>
    </article>
  );
}
