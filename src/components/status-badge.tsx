import type { ProductStatus } from "@/data/products";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: ProductStatus;
  className?: string;
}) {
  const inStock = status === "In Stock";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.65rem] tracking-[0.16em] uppercase",
        inStock
          ? "bg-primary text-primary-foreground"
          : "bg-accent/25 text-primary ring-1 ring-accent/50",
        className,
      )}
    >
      {status}
    </span>
  );
}
