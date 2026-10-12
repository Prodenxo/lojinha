"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/format";

type AdminOrder = {
  id: number;
  code: string;
  product_name: string;
  amount_cents: number;
  customer_email: string;
  customer_phone: string;
  status: "pending" | "paid" | "delivered" | "cancelled";
  capture_method: string | null;
  delivery: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<AdminOrder["status"], string> = {
  pending: "Aguardando pagamento",
  paid: "Pago, falta entregar",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");

  const call = useCallback(async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`/api/admin/${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-admin-token": localStorage.getItem("admin-token") ?? "",
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `Erro ${res.status}`);
    return body;
  }, []);

  const load = useCallback(async () => {
    try {
      setOrders((await call("orders")).data);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }, [call]);

  useEffect(() => {
    // Carrega ao abrir e atualiza a cada 30 s; o setState só acontece depois do fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  async function deliver(order: AdminOrder) {
    try {
      await call(`orders/${order.id}/deliver`, {
        method: "PUT",
        body: JSON.stringify({ delivery: drafts[order.id] ?? order.delivery ?? "" }),
      });
      setMessage(`Pedido ${order.code.slice(0, 8).toUpperCase()} entregue.`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="mr-auto text-xl font-semibold">Pedidos</h1>
        <Link href="/admin" className="rounded-lg border border-border px-3 py-2 text-sm hover:border-accent">
          Produtos
        </Link>
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}
      {orders?.length === 0 && <p className="py-10 text-center text-muted">Nenhum pedido ainda.</p>}

      {orders?.map((order) => (
        <div
          key={order.id}
          className={`flex flex-col gap-3 rounded-2xl border bg-surface p-4 ${
            order.status === "paid" ? "border-accent" : "border-border"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{order.product_name}</span>
            <span className="font-semibold text-accent-strong">
              {formatBRL(order.amount_cents / 100)}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>{STATUS_LABEL[order.status]}</span>
            <span>{order.customer_email}</span>
            <a
              className="underline hover:text-foreground"
              href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {order.customer_phone}
            </a>
            <span>{new Date(order.created_at).toLocaleString("pt-BR")}</span>
            <Link className="underline hover:text-foreground" href={`/pedido/${order.code}`}>
              Ver página do cliente
            </Link>
          </div>
          {(order.status === "paid" || order.status === "delivered") && (
            <>
              <textarea
                className={input}
                rows={3}
                placeholder="Cole aqui a conta, o link ou o código que o cliente vai receber"
                value={drafts[order.id] ?? order.delivery ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [order.id]: e.target.value }))}
              />
              <button
                className="self-end rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black"
                onClick={() => deliver(order)}
              >
                {order.status === "paid" ? "Entregar ao cliente" : "Atualizar entrega"}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
