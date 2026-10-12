import type { Product } from "@/lib/api";
import { categoryHue } from "@/lib/format";

type Props = {
  product: Pick<Product, "name" | "category" | "emoji">;
  image?: string;
  className?: string;
};

// Foto do produto; sem foto cadastrada, um bloco colorido com a marca.
export function ProductVisual({ product, image, className = "" }: Props) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={product.name} className={`object-cover ${className}`} />
    );
  }
  const hue = categoryHue(product.category);
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 50% 12%))`,
      }}
    >
      <span className="text-4xl">{product.emoji ?? product.category.charAt(0)}</span>
      <span className="px-3 text-center text-sm font-medium text-white/80">{product.category}</span>
    </div>
  );
}
