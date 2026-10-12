import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BuyForm } from "@/components/BuyForm";
import { ProductVisual } from "@/components/ProductVisual";
import { getProduct } from "@/lib/api";
import { categoryLabel } from "@/lib/brands";
import { Price } from "@/components/Price";
import { deliveryLabel, durationLabel } from "@/lib/format";

type Params = Promise<{ slug: string }>;

async function ProductDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const soldOut = product.stock <= 0;
  const whatsapp = process.env.WHATSAPP_NUMBER;
  const helpUrl = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre: ${product.name}`)}`
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
        <Price product={product} size="lg" />

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
        ) : (
          <BuyForm slug={product.slug} />
        )}

        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-sm text-muted underline hover:text-foreground"
          >
            Dúvidas? Fale com a gente no WhatsApp
          </a>
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
