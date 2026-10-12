"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, clearSession, useSession } from "@/lib/auth";
import { formatBRL } from "@/lib/format";

type Order = {
  code: string;
  product_name: string;
  amount_cents: number;
  status: "pending" | "paid" | "delivered" | "cancelled";
  created_at: string;
};

const STATUS: Record<Order["status"], string> = {
  pending: "Aguardando pagamento",
  paid: "Pago, em preparação",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export function MyOrders() {
  const session = useSession();
  const token = session?.token;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api<{ data: Order[] }>("account/orders", { token })
      .then((res) => setOrders(res.data))
      .catch((err) => setError((err as Error).message));
  }, [token]);

  if (!session) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted">Entre na sua conta para ver seus pedidos.</p>
        <Link
          href="/entrar?next=/meus-pedidos"
          className="rounded-xl bg-accent py-3 text-center font-semibold text-black transition hover:bg-accent-strong"
        >
          Entrar ou criar conta
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>
          {session.name} ({session.email})
        </span>
        <button
          className="underline hover:text-foreground"
          onClick={() => {
            api("auth/logout", { method: "POST", token: session.token }).catch(() => null);
            clearSession();
          }}
        >
          Sair
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!orders && !error && <div className="h-40 animate-pulse rounded-2xl bg-surface" />}
      {orders?.length === 0 && (
        <p className="py-8 text-center text-muted">Você ainda não fez nenhum pedido.</p>
      )}
      {orders?.map((order) => (
        <Link
          key={order.code}
          href={`/pedido/${order.code}`}
          className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 transition hover:border-accent"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{order.product_name}</span>
            <span className="shrink-0 font-semibold text-accent-strong">
              {formatBRL(order.amount_cents / 100)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm text-muted">
            <span>{STATUS[order.status]}</span>
            <span>{new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
