import type { Product } from "@/lib/api";
import { brandColor, brandLogo, brandName } from "@/lib/brands";

type Props = {
  product: Pick<Product, "name" | "category">;
  image?: string;
  className?: string;
};

// Foto do produto; sem foto cadastrada, um bloco na cor da marca com a logo.
export function ProductVisual({ product, image, className = "" }: Props) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={product.name} className={`object-cover ${className}`} />
    );
  }
  const brand = brandName(product);
  const color = brandColor(brand);
  const logo = brandLogo(brand);
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 30%, #060a08))`,
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="h-16 w-16 rounded-2xl bg-white object-contain p-2 shadow-lg shadow-black/30"
        />
      ) : (
        <span
          aria-hidden
          className="absolute -bottom-8 -right-2 select-none text-[9rem] font-black leading-none text-white/10"
        >
          {brand.charAt(0).toUpperCase()}
        </span>
      )}
      <span
        className={`relative px-3 text-center font-bold tracking-tight text-white drop-shadow-sm ${
          logo ? "text-base" : "text-xl"
        }`}
      >
        {brand}
      </span>
    </div>
  );
}
