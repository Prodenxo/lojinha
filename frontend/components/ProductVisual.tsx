import type { Product } from "@/lib/api";
import { brandColor, brandLogo, productBrands } from "@/lib/brands";

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
  const brands = productBrands(product);
  const color = brandColor(brands[0]);
  const logos = brands.map(brandLogo).filter((logo) => logo !== null);
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 30%, #060a08))`,
      }}
    >
      {logos.length > 0 ? (
        <div className="flex items-center gap-2">
          {logos.map((logo, index) => (
            <span key={logo} className="flex items-center gap-2">
              {index > 0 && <span className="text-2xl font-bold text-white/80">+</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt=""
                className="h-16 w-16 rounded-2xl bg-white object-contain p-2 shadow-lg shadow-black/30"
              />
            </span>
          ))}
        </div>
      ) : (
        <span
          aria-hidden
          className="absolute -bottom-8 -right-2 select-none text-[9rem] font-black leading-none text-white/10"
        >
          {brands[0].charAt(0).toUpperCase()}
        </span>
      )}
      <span
        className={`relative px-3 text-center font-bold tracking-tight text-white drop-shadow-sm ${
          logos.length > 0 ? "text-base" : "text-xl"
        }`}
      >
        {brands.join(" + ")}
      </span>
    </div>
  );
}
