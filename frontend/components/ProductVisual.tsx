import type { Product } from "@/lib/api";
import { brandColor, brandLogo, productBrands } from "@/lib/brands";

type Props = {
  product: Pick<Product, "name" | "category">;
  image?: string;
  className?: string;
  compact?: boolean;
};

// Foto do produto; sem foto cadastrada, um bloco na cor da marca com a logo.
// compact: logo e nome menores no celular.
export function ProductVisual({ product, image, className = "", compact = false }: Props) {
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
      className={`relative flex flex-col items-center justify-center overflow-hidden ${
        compact ? "gap-1 sm:gap-3" : "gap-3"
      } ${className}`}
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
                className={`bg-white object-contain shadow-lg shadow-black/30 ${
                  compact
                    ? "h-9 w-9 rounded-lg p-1 sm:h-16 sm:w-16 sm:rounded-2xl sm:p-2"
                    : "h-16 w-16 rounded-2xl p-2"
                }`}
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
        className={`relative text-center font-bold tracking-tight text-white drop-shadow-sm ${
          compact
            ? "px-1 text-[10px] sm:px-3 sm:text-base"
            : logos.length > 0
              ? "px-3 text-base"
              : "px-3 text-xl"
        }`}
      >
        {brands.join(" + ")}
      </span>
    </div>
  );
}
