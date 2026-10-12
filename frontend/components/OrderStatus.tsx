"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/format";

type Order = {
  code: string;
  product_name: string;
  amount_cents: number;
  status: "pending" | "paid" | "delivered" | "cancelled";
  checkout_url: string | null;
  receipt_url: string | null;
  delivery: string | null;
};

const STATUS: Record<Order["status"], { title: string; text: string }> = {
  pending: {
    title: "Aguardando pagamento",
    text: "Assim que o pagamento for aprovado, esta página atualiza sozinha.",
  },
  paid: {
    title: "Pagamento aprovado",
    text: "Estamos preparando sua entrega. Ela aparece aqui nesta página; não precisa recarregar.",
  },
  delivered: { title: "Pedido entregue", text: "Seus dados de acesso estão abaixo." },
  cancelled: { title: "Pedido cancelado", text: "Este pedido não foi concluído." },
};

export function OrderStatus() {
  const { code } = useParams<{ code: string }>();
  const search = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  const transactionNsu = search.get("transaction_nsu");
  const slug = search.get("slug");
  const receiptUrl = search.get("receipt_url");

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      const res = await fetch(`/api/orders/${code}`).catch(() => null);
      if (stop) return;
      if (res?.status === 404) return setMissing(true);
      if (res?.ok) {
        const next: Order = (await res.json()).data;
        setOrder(next);
        if (next.status === "delivered" || next.status === "cancelled") return;
      }
      timer = setTimeout(load, 5000);
    }

    async function start() {
      // Voltando do pagamento: confirma na hora, sem depender do webhook.
      if (transactionNsu && slug) {
        await fetch(`/api/orders/${code}/confirm`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transaction_nsu: transactionNsu, slug, receipt_url: receiptUrl }),
        }).catch(() => null);
      }
      load();
    }

    start();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [code, transactionNsu, slug, receiptUrl]);

  if (missing) return <p className="py-16 text-center text-muted">Pedido não encontrado.</p>;
  if (!order) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;

  const status = STATUS[order.status];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">Pedido {order.code.slice(0, 8).toUpperCase()}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{status.title}</h1>
        <p className="mt-1 text-muted">{status.text}</p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span>{order.product_name}</span>
          <span className="font-semibold text-accent-strong">
            {formatBRL(order.amount_cents / 100)}
          </span>
        </div>
      </div>

      {order.status === "pending" && order.checkout_url && (
        <a
          href={order.checkout_url}
          className="rounded-xl bg-accent py-3 text-center font-semibold text-black transition hover:bg-accent-strong"
        >
          Ir para o pagamento
        </a>
      )}

      {order.delivery && (
        <div className="rounded-2xl border border-accent/50 bg-accent/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-accent-strong">Sua entrega</h2>
            <button
              className="rounded-lg border border-border px-3 py-1 text-sm hover:border-accent"
              onClick={() => {
                navigator.clipboard.writeText(order.delivery ?? "");
                setCopied(true);
              }}
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-sm">{order.delivery}</pre>
        </div>
      )}

      {order.receipt_url && (
        <a
          href={order.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm text-muted underline hover:text-foreground"
        >
          Ver comprovante de pagamento
        </a>
      )}

      <p className="text-center text-xs text-muted">
        Guarde o endereço desta página: é por ele que você consulta o pedido.
      </p>
    </div>
  );
}
