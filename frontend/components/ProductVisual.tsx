import type { Product } from "@/lib/api";
import { brandColor, brandName } from "@/lib/brands";

type Props = {
  product: Pick<Product, "name" | "category">;
  image?: string;
  className?: string;
};

// Foto do produto; sem foto cadastrada, um bloco na cor da marca.
export function ProductVisual({ product, image, className = "" }: Props) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={product.name} className={`object-cover ${className}`} />
    );
  }
  const brand = brandName(product);
  const color = brandColor(brand);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 30%, #060a08))`,
      }}
    >
      <span
        aria-hidden
        className="absolute -bottom-8 -right-2 select-none text-[9rem] font-black leading-none text-white/10"
      >
        {brand.charAt(0).toUpperCase()}
      </span>
      <span className="relative px-3 text-center text-xl font-bold tracking-tight text-white drop-shadow-sm">
        {brand}
      </span>
    </div>
  );
}
