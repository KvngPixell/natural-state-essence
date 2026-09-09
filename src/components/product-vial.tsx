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
        style={{
          left: "34%",
          right: "34%",
          top: "50%",
          bottom: "26%",
          containerType: "inline-size",
        }}
      >
        <span
          className="font-serif leading-tight break-words text-[#1f3d2b]"
          style={{ fontSize: long ? "13cqw" : "20cqw" }}
        >
          {product.name}
        </span>
        <span
          className="mt-[0.4em] font-serif tracking-[0.12em] text-[#9a7b3f] uppercase"
          style={{ fontSize: "11cqw" }}
        >
          {product.strength}
        </span>
      </div>
    </div>
  );
}
