"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/api";
import { categoryLabel } from "@/lib/brands";
import { durationLabel } from "@/lib/format";
import { Price, promoPrice } from "./Price";
import { ProductVisual } from "./ProductVisual";

const GRID = "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";

function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0;
  const duration = durationLabel(product.duration_days);
  const badge = soldOut
    ? "Esgotado"
    : promoPrice(product)
      ? "Promoção"
      : product.featured
        ? "Destaque"
        : null;
  return (
    <Link
      href={`/produto/${product.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-surface transition hover:-translate-y-0.5 hover:border-accent ${
        product.featured && !soldOut ? "border-accent/60" : "border-border"
      }`}
    >
      <div className="relative">
        <ProductVisual
          product={product}
          image={product.images[0]}
          className={`aspect-[4/3] w-full ${soldOut ? "opacity-40" : ""}`}
        />
        {badge && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-semibold ${
              soldOut ? "bg-black/70 text-white" : "bg-accent text-black"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h2 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h2>
        <div className="mt-auto flex items-end justify-between gap-2">
          <Price product={product} />
          {duration && <span className="text-xs text-muted">{duration}</span>}
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
  const featured = products.filter((p) => p.featured && p.stock > 0);
  const visible = products.filter(
    (p) =>
      (!category || p.category === category) &&
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
      active
        ? "border-accent bg-accent text-black"
        : "border-border text-muted hover:border-accent hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col gap-6">
      {!filtering && featured.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent/5 p-4">
          <h2 className="text-lg font-semibold text-accent-strong">★ Destaques</h2>
          <div className={GRID}>
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
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
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
