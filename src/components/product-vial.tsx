import vialImage from "@/assets/vial-nsp.jpg";
import type { Product } from "@/data/products";

/**
 * Branded Natural State Peptides vial: the rendered vial photo with the
 * product name and strength set into the blank area of the label.
 */
export function ProductVial({
  product,
  eager = false,
  className = "",
}: {
  product: Product;
  eager?: boolean;
  className?: string;
}) {
  const long = product.name.length > 16;

  return (
    <div className={`relative aspect-square w-full overflow-hidden ${className}`}>
      <img
        src={vialImage}
        alt={`${product.name} ${product.strength} vial from Natural State Peptides`}
        loading={eager ? "eager" : "lazy"}
        width={1024}
        height={1024}
        className="size-full object-cover"
      />
      <div
        className="pointer-events-none absolute flex flex-col items-center justify-center text-center"
        style={{ left: "35%", right: "35%", top: "51%", bottom: "27%" }}
      >
        <span
          className={`font-serif leading-tight text-[#1f3d2b] ${
            long ? "text-[clamp(0.5rem,2.1cqw,0.95rem)]" : "text-[clamp(0.7rem,3.4cqw,1.6rem)]"
          }`}
          style={{ containerType: "inline-size" }}
        >
          {product.name}
        </span>
        <span className="mt-[0.35em] font-serif text-[clamp(0.5rem,2cqw,0.95rem)] tracking-[0.12em] text-[#9a7b3f] uppercase">
          {product.strength}
        </span>
      </div>
    </div>
  );
}
