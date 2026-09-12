import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { QtyStepper } from "@/components/cart-drawer";
import { backendReady } from "@/lib/backend";
import { getSku, usd, type Product, type Sku } from "@/data/products";

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

const BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-primary/25 px-4 py-2 text-sm text-primary transition-colors hover:border-accent hover:text-accent";

/** Compact card button. Products sold in more than one strength ask which first. */
export function AddButton({ product, className = "" }: { product: Product; className?: string }) {
  const { add, setOpen } = useCart();
  const [added, setAdded] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  const inStock = product.variants.filter((v) => v.status === "In Stock");

  useEffect(() => {
    if (!choosing) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setChoosing(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setChoosing(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [choosing]);

  if (!backendReady || inStock.length === 0) return null;

  function addSku(sku: string) {
    add(sku, 1);
    setChoosing(false);
    setAdded(true);
    setOpen(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  if (inStock.length === 1) {
    const only = getSku(inStock[0].sku);
    if (!only) return null;
    return (
      <button
        type="button"
        aria-label={`Add ${only.label} to your order`}
        onClick={() => addSku(only.sku)}
        className={BUTTON + " " + className}
      >
        {added ? <Check className="size-4" /> : <Plus className="size-4" />}
        {added ? "Added" : "Add"}
      </button>
    );
  }

  return (
    <div ref={box} className={"relative " + className}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={choosing}
        onClick={() => setChoosing((v) => !v)}
        className={BUTTON}
      >
        {added ? <Check className="size-4" /> : <Plus className="size-4" />}
        {added ? "Added" : "Add"}
      </button>
      {choosing && (
        <div
          role="menu"
          aria-label={`Choose a strength of ${product.name}`}
          className="absolute right-0 bottom-full z-30 mb-2 w-44 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lift"
        >
          <p className="px-3 py-2 text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">Choose a strength</p>
          {inStock.map((v) => (
            <button
              key={v.sku}
              role="menuitem"
              type="button"
              onClick={() => addSku(v.sku)}
              className="flex w-full items-baseline justify-between gap-3 rounded px-3 py-2.5 text-left text-sm text-primary hover:bg-secondary"
            >
              <span>{v.strength}</span>
              {v.prices && <span className="text-xs text-muted-foreground tabular-nums">{usd(v.prices[0])}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
