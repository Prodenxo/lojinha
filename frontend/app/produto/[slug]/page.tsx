import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductVisual } from "@/components/ProductVisual";
import { getProduct } from "@/lib/api";
import { categoryLabel } from "@/lib/brands";
import { deliveryLabel, durationLabel, formatBRL } from "@/lib/format";

type Params = Promise<{ slug: string }>;

async function ProductDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const soldOut = product.stock <= 0;
  const whatsapp = process.env.WHATSAPP_NUMBER;
  const buyUrl = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Quero comprar: ${product.name}`)}`
    : null;
  const facts = [
    ["Duração", durationLabel(product.duration_days)],
    ["Entrega", deliveryLabel(product.delivery_type)],
    ["Categoria", categoryLabel(product.category)],
  ].filter(([, value]) => value);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <ProductVisual
          product={product}
          image={product.images[0]}
          className="aspect-[4/3] w-full rounded-2xl border border-border"
        />
        {product.images.length > 1 && (
          <div className="grid grid-cols-4 gap-3">
            {product.images.slice(1).map((src) => (
              <ProductVisual
                key={src}
                product={product}
                image={src}
                className="aspect-square w-full rounded-xl border border-border"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
        <p className="text-3xl font-semibold text-accent-strong">{formatBRL(product.price_brl)}</p>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-surface p-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {product.description && (
          <p className="whitespace-pre-line leading-relaxed text-foreground/85">
            {product.description}
          </p>
        )}

        {soldOut ? (
          <span className="rounded-xl border border-border py-3 text-center text-muted">
            Esgotado no momento
          </span>
        ) : buyUrl ? (
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-accent py-3 text-center font-semibold text-black transition hover:bg-accent-strong"
          >
            Comprar pelo WhatsApp
          </a>
        ) : (
          <span className="rounded-xl border border-border py-3 text-center text-muted">
            Compra online em breve
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProductPage({ params }: { params: Params }) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Voltar ao catálogo
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  );
}
