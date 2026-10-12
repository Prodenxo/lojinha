export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  emoji: string | null;
  delivery_type: string | null;
  duration_days: number | null;
  price_brl: number;
  promo_price_brl: number | null;
  featured: number;
  stock: number;
  images: string[];
};

// URL interna do backend — usada só no servidor do Next, nunca no navegador.
export const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Backend respondeu ${res.status}`);
  return (await res.json()).data;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const res = await fetch(`${API_URL}/api/products/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend respondeu ${res.status}`);
  return (await res.json()).data;
}
