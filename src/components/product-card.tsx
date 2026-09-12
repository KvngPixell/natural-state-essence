import { Link } from "@tanstack/react-router";
import { getSku, usd, type Product } from "@/data/products";
import { AddButton } from "@/components/add-to-order";
import { ProductVial } from "@/components/product-vial";
import { StatusBadge } from "@/components/status-badge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative overflow-hidden bg-secondary/50">
        <ProductVial
          product={product}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <StatusBadge status={product.status} className="absolute top-3 left-3" />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-[0.65rem] tracking-[0.2em] text-accent uppercase">
          {product.category}
        </p>
        <h3 className="mt-2 font-serif text-2xl text-primary">{product.name}</h3>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm text-muted-foreground">{product.variants.map((v) => v.strength).join(" · ")}</p>
          <p className="text-sm text-primary">
            {product.fromPrice != null ? (
              <>
                <span className="text-muted-foreground">from </span>
                <span className="font-serif text-lg">{usd(product.fromPrice)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Price coming soon</span>
            )}
          </p>
        </div>
        <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/75">
          {product.shortDescription}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            className="inline-flex w-fit border-b border-accent/60 pb-1 text-sm text-primary transition-colors hover:text-accent"
          >
            View Product
          </Link>
          {product.status === "In Stock" && product.variants.length === 1 && (
            <AddButton sku={getSku(product.variants[0].sku)!} className="ml-auto" />
          )}
        </div>
      </div>
    </article>
  );
}
