import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSku, priceCents, MAX_PRICED_QTY } from "@/data/products";

export interface CartLine {
  /** Product SKU (slug for the default strength). */
  slug: string;
  quantity: number;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  /** Sum of the published prices; lines above the published quantities are quoted. */
  estimate: { cents: number; quoted: boolean };
  add: (sku: string, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  setLines: (update: CartLine[] | ((prev: CartLine[]) => CartLine[])) => void;
  /** Slide-over state, shared so any "add" can open it. */
  open: boolean;
  setOpen: (open: boolean) => void;
}

const KEY = "nsp_cart";
const MAX_LINES = 20;
const MAX_QTY = 99;

const CartContext = createContext<CartValue | null>(null);

/** Drop anything that is no longer a real, orderable product. */
function clean(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const item of raw) {
    const slug = typeof item?.slug === "string" ? item.slug : "";
    const qty = Number(item?.quantity);
    const sku = getSku(slug);
    if (!sku || sku.status !== "In Stock" || !Number.isFinite(qty)) continue;
    if (out.some((l) => l.slug === slug)) continue;
    out.push({ slug, quantity: Math.max(1, Math.min(MAX_QTY, Math.round(qty))) });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLinesState] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // The cart lives in this browser only. Reading it can throw in private modes.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setLinesState(clean(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, ready]);

  const value = useMemo<CartValue>(() => {
    const setLines: CartValue["setLines"] = (update) =>
      setLinesState((prev) => clean(typeof update === "function" ? update(prev) : update));
    return {
      lines,
      count: lines.reduce((a, l) => a + l.quantity, 0),
      estimate: lines.reduce<{ cents: number; quoted: boolean }>(
        (acc, l) => {
          const c = priceCents(l.slug, l.quantity);
          return c == null ? { ...acc, quoted: true } : { ...acc, cents: acc.cents + c };
        },
        { cents: 0, quoted: false },
      ),
      add: (sku, quantity = 1) =>
        setLines((prev) => {
          const found = prev.find((l) => l.slug === sku);
          if (found) return prev.map((l) => (l.slug === sku ? { ...l, quantity: l.quantity + quantity } : l));
          return [...prev, { slug: sku, quantity }];
        }),
      setQuantity: (sku, quantity) =>
        setLines((prev) =>
          quantity <= 0
            ? prev.filter((l) => l.slug !== sku)
            : prev.map((l) => (l.slug === sku ? { ...l, quantity } : l)),
        ),
      remove: (sku) => setLines((prev) => prev.filter((l) => l.slug !== sku)),
      clear: () => setLinesState([]),
      setLines,
      open,
      setOpen,
    };
  }, [lines, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

export { MAX_PRICED_QTY };
