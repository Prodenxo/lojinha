"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/api";
import { brandKey, categoryLabel, groupTitle } from "@/lib/brands";
import { durationLabel } from "@/lib/format";
import { Price, promoPrice } from "./Price";
import { ProductVisual } from "./ProductVisual";

const GRID = "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";

// Um card por serviço: `product` é a opção mostrada e `options` são todas as do serviço.
type Group = { product: Product; options: Product[] };

const finalPrice = (product: Product) => promoPrice(product) ?? product.price_brl;

function groupByBrand(products: Product[]): Group[] {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const key = brandKey(product);
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }
  return [...groups.values()].map((options) => ({
    product:
      options.find((p) => p.featured) ??
      options.reduce((cheapest, p) => (finalPrice(p) < finalPrice(cheapest) ? p : cheapest)),
    options,
  }));
}

// compact: card do bloco de destaques, que no celular cabe 4 por linha.
function ProductCard({ group, compact = false }: { group: Group; compact?: boolean }) {
  const { product, options } = group;
  const many = !compact && options.length > 1;
  const soldOut = product.stock <= 0;
  const duration = durationLabel(product.duration_days);
  const badge = soldOut
    ? "Esgotado"
    : promoPrice(product)
      ? "Promoção"
      : product.featured && !compact
        ? "Destaque"
        : null;
  return (
    <Link
      href={`/produto/${product.slug}`}
      className={`group flex flex-col overflow-hidden border bg-surface transition hover:-translate-y-0.5 hover:border-accent ${
        compact ? "rounded-xl sm:rounded-2xl" : "rounded-2xl"
      } ${product.featured && !soldOut ? "border-accent/60" : "border-border"}`}
    >
      <div className="relative">
        <ProductVisual
          product={product}
          image={product.images[0]}
          compact={compact}
          className={`w-full ${compact ? "aspect-square sm:aspect-[4/3]" : "aspect-[4/3]"} ${
            soldOut ? "opacity-40" : ""
          }`}
        />
        {badge && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-semibold ${
              compact ? "hidden sm:block" : ""
            } ${soldOut ? "bg-black/70 text-white" : "bg-accent text-black"}`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-1.5 sm:p-3" : "p-3"}`}>
        <h2
          className={`line-clamp-2 text-sm font-medium leading-snug ${
            compact ? "hidden sm:block" : ""
          }`}
        >
          {many ? groupTitle(options) : product.name}
        </h2>
        <div className="mt-auto flex items-end justify-between gap-2">
          <span className="flex flex-col">
            {many && <span className="text-xs text-muted">a partir de</span>}
            <Price product={product} size={compact ? "sm" : "md"} />
          </span>
          {many ? (
            <span className="text-xs text-muted">{options.length} opções</span>
          ) : (
            duration && (
              <span className={`text-xs text-muted ${compact ? "hidden sm:block" : ""}`}>
                {duration}
              </span>
            )
          )}
        </div>
      </div>
    </Link>
  );
}

export function CatalogGrid({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const filtering = category !== null || query.trim() !== "";
  const featured = groupByBrand(products).filter(
    ({ product }) => product.featured && product.stock > 0,
  );
  const featuredKeys = new Set(featured.map(({ product }) => brandKey(product)));
  // Sem filtro, o que já está nos destaques não se repete na lista de baixo.
  const visible = groupByBrand(
    products.filter(
      (p) =>
        (!category || p.category === category) &&
        p.name.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  ).filter(({ product }) => filtering || !featuredKeys.has(brandKey(product)));

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
      active
        ? "border-accent bg-accent text-black"
        : "border-border text-muted hover:border-accent hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col gap-6">
      {!filtering && featured.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent/5 p-2.5 sm:p-4">
          <h2 className="px-1 text-lg font-semibold text-accent-strong sm:px-0">★ Destaques</h2>
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {featured.map((group) => (
              <ProductCard key={group.product.id} group={group} compact />
            ))}
          </div>
        </section>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar produto..."
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none placeholder:text-muted focus:border-accent"
      />

      <div className="flex flex-wrap gap-2">
        <button className={chip(category === null)} onClick={() => setCategory(null)}>
          Todos
        </button>
        {categories.map((name) => (
          <button key={name} className={chip(category === name)} onClick={() => setCategory(name)}>
            {categoryLabel(name)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-muted">Nenhum produto encontrado.</p>
      ) : (
        <div className={GRID}>
          {visible.map((group) => (
            <ProductCard key={group.product.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
