import type { Product } from "@/lib/api";
import { formatBRL } from "@/lib/format";

// Preço promocional só vale se for menor que o preço normal.
export function promoPrice(product: Pick<Product, "price_brl" | "promo_price_brl">) {
  const promo = product.promo_price_brl;
  return promo != null && promo > 0 && promo < product.price_brl ? promo : null;
}

type Props = {
  product: Pick<Product, "price_brl" | "promo_price_brl">;
  size?: "sm" | "md" | "lg";
};

// "sm" encolhe só no celular (cards de destaque, 4 por linha).
const SIZES = { sm: "text-[11px] sm:text-lg", md: "text-lg", lg: "text-3xl" };

export function Price({ product, size = "md" }: Props) {
  const promo = promoPrice(product);
  const main = SIZES[size];
  return (
    <span className="flex flex-col">
      {promo && (
        <span className="text-xs text-muted line-through">{formatBRL(product.price_brl)}</span>
      )}
      <span className={`${main} font-semibold text-accent-strong`}>
        {formatBRL(promo ?? product.price_brl)}
      </span>
    </span>
  );
}
