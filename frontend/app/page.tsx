import { connection } from "next/server";
import { Suspense } from "react";
import { CatalogGrid } from "@/components/CatalogGrid";
import { getProducts, type Product } from "@/lib/api";

async function Catalog() {
  await connection();
  let products: Product[];
  try {
    products = await getProducts();
  } catch {
    return (
      <p className="py-16 text-center text-muted">
        Não foi possível carregar o catálogo agora. Tente novamente em instantes.
      </p>
    );
  }
  return <CatalogGrid products={products} />;
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
        <p className="text-muted">Assinaturas e contas digitais com entrega rápida.</p>
      </div>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog />
      </Suspense>
    </div>
  );
}
