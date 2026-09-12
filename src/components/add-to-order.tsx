import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { QtyStepper } from "@/components/cart-drawer";
import { backendReady } from "@/lib/backend";
import type { Sku } from "@/data/products";

/** Full control for a product page: pick a quantity, add it, review in the drawer. */
export function AddToOrder({ sku }: { sku: Sku }) {
  const { add, setOpen } = useCart();
  const [quantity, setQuantity] = useState(1);
  if (!backendReady || sku.status !== "In Stock") return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <QtyStepper value={quantity} onChange={setQuantity} label={sku.label} />
      <button
        type="button"
        onClick={() => {
          add(sku.sku, quantity);
          setQuantity(1);
          setOpen(true);
        }}
        className="inline-flex flex-1 justify-center rounded-md bg-primary px-7 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 sm:flex-none"
      >
        Add to Order
      </button>
    </div>
  );
}

/** Compact version for catalog cards. */
export function AddButton({ sku, className = "" }: { sku: Sku; className?: string }) {
  const { add, setOpen } = useCart();
  const [added, setAdded] = useState(false);
  if (!backendReady || sku.status !== "In Stock") return null;
  return (
    <button
      type="button"
      aria-label={`Add ${sku.label} to your order`}
      onClick={() => {
        add(sku.sku, 1);
        setAdded(true);
        setOpen(true);
        window.setTimeout(() => setAdded(false), 1500);
      }}
      className={
        "inline-flex items-center gap-1.5 rounded-md border border-primary/25 px-4 py-2 text-sm text-primary transition-colors hover:border-accent hover:text-accent " +
        className
      }
    >
      {added ? <Check className="size-4" /> : <Plus className="size-4" />}
      {added ? "Added" : "Add"}
    </button>
  );
}
