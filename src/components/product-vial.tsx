import vialImage from "@/assets/vial-label-template.png";
import ssImage from "@/assets/vial-ss31.png";
import type { Product } from "@/data/products";

/**
 * Branded Natural State Peptides vial: the rendered vial photo with the
 * product name and strength set into the blank area of the label.
 */
export function ProductVial({
  product,
  strength,
  eager = false,
  className = "",
}: {
  product: Product;
  /** Strength printed on the label; defaults to the product's first strength. */
  strength?: string;
  eager?: boolean;
  className?: string;
}) {
  const long = product.name.length > 16;
  const label = strength ?? product.strength;

  return (
    <div className={`relative aspect-square w-full overflow-hidden ${className}`}>
      <img
        src={product.slug === "ss-31" ? ssImage : vialImage}
        alt={`${product.name} ${label} vial from Natural State Peptides`}
        loading={eager ? "eager" : "lazy"}
        width={1254}
        height={1254}
        className="size-full object-cover"
      />
      {product.slug !== "ss-31" && (
        <div
          className="pointer-events-none absolute flex flex-col items-center justify-center text-center"
          style={{
            left: "37%",
            right: "34%",
            top: "61%",
            bottom: "22%",
            containerType: "inline-size",
          }}
        >
          <span
            className="font-serif leading-tight break-words text-[#1f3d2b]"
            style={{ fontSize: long ? "12cqw" : "19cqw" }}
          >
            {product.name}
          </span>
          <span
            className="mt-[0.4em] font-serif tracking-[0.12em] text-[#9a7b3f] uppercase"
            style={{ fontSize: "11cqw" }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
