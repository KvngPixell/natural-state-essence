import { Link } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useCart } from "@/components/cart-context";
import { getSku, priceCents, usd, MAX_PRICED_QTY } from "@/data/products";

export const money = (cents: number) => usd(cents / 100);

/** Quantity stepper shared by the drawer and the order page. */
export function QtyStepper({
  value,
  onChange,
  label,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background">
      <button
        type="button"
        aria-label={`Decrease quantity of ${label}`}
        className="p-2.5 text-primary disabled:opacity-40"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <Minus className="size-4" />
      </button>
      <input
        aria-label={`Quantity of ${label}`}
        inputMode="numeric"
        className="w-10 bg-transparent text-center text-base tabular-nums outline-none"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          onChange(Number.isFinite(n) ? Math.min(max, Math.max(1, n)) : 1);
        }}
      />
      <button
        type="button"
        aria-label={`Increase quantity of ${label}`}
        className="p-2.5 text-primary disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Slide-over summary of the order being built. Opens when something is added. */
export function CartDrawer() {
  const { lines, count, estimate, setQuantity, remove, open, setOpen } = useCart();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-5 text-left sm:px-6">
          <SheetTitle className="font-serif text-2xl font-normal text-primary">Your order</SheetTitle>
          <SheetDescription>
            {count === 0
              ? "Nothing here yet."
              : `${count} vial${count === 1 ? "" : "s"} — we confirm your total before you pay.`}
          </SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">Add products from the catalog to start an order request.</p>
            <Link
              to="/catalog"
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-6 py-3 text-sm text-primary-foreground"
            >
              Browse the catalog
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border px-5 sm:px-6">
              {lines.map((l) => {
                const sku = getSku(l.slug);
                if (!sku) return null;
                const price = priceCents(l.slug, l.quantity);
                return (
                  <li key={l.slug} className="flex items-start gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg leading-tight text-primary">{sku.name}</p>
                      <p className="text-xs text-muted-foreground">{sku.strength}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <QtyStepper value={l.quantity} onChange={(n) => setQuantity(l.slug, n)} label={sku.label} />
                        <button
                          type="button"
                          onClick={() => remove(l.slug)}
                          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-destructive"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 pt-1 text-right text-sm tabular-nums text-primary">
                      {price != null ? money(price) : <span className="text-muted-foreground">We'll quote</span>}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="sticky bottom-0 border-t border-border bg-background px-5 py-5 sm:px-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Estimated total{estimate.quoted ? " (plus items we'll quote)" : ""}
                </span>
                <span className="font-serif text-2xl text-primary tabular-nums">{money(estimate.cents)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Prices cover 1–{MAX_PRICED_QTY} vials of each item. No payment is taken on this site.
              </p>
              <Link
                to="/order"
                onClick={() => setOpen(false)}
                className="mt-4 flex w-full items-center justify-center rounded-md bg-primary px-6 py-3.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
              >
                Continue to order request →
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-sm text-primary underline underline-offset-4"
              >
                Keep browsing
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
