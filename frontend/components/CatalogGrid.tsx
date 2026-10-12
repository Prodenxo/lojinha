"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/api";
import { durationLabel, formatBRL } from "@/lib/format";
import { ProductVisual } from "./ProductVisual";

export function CatalogGrid({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b)),
    [products],
  );

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
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar produto..."
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none placeholder:text-muted focus:border-accent"
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className={chip(category === null)} onClick={() => setCategory(null)}>
          Todos
        </button>
        {categories.map((name) => (
          <button key={name} className={chip(category === name)} onClick={() => setCategory(name)}>
            {name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-muted">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => {
            const soldOut = product.stock <= 0;
            const duration = durationLabel(product.duration_days);
            return (
              <Link
                key={product.id}
                href={`/produto/${product.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-accent"
              >
                <div className="relative">
                  <ProductVisual
                    product={product}
                    image={product.images[0]}
                    className={`aspect-[4/3] w-full ${soldOut ? "opacity-40" : ""}`}
                  />
                  {soldOut && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs">
                      Esgotado
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <h2 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h2>
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <span className="text-lg font-semibold text-accent-strong">
                      {formatBRL(product.price_brl)}
                    </span>
                    {duration && <span className="text-xs text-muted">{duration}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
