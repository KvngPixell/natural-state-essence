import type { ProductStatus } from "@/data/products";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: ProductStatus;
  className?: string;
}) {
  const tone: Record<ProductStatus, string> = {
    "In Stock": "bg-primary text-primary-foreground",
    // Muted rather than alarming: being briefly out is normal, not a problem.
    "Sold Out": "bg-secondary text-muted-foreground ring-1 ring-border",
    "Coming Soon": "bg-accent/25 text-primary ring-1 ring-accent/50",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.65rem] tracking-[0.16em] uppercase",
        tone[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
