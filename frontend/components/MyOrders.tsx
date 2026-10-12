"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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

function RequestLink({ notice }: { notice?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const res = await fetch("/api/my-orders/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    if (res?.ok) return setState("sent");
    const body = await res?.json().catch(() => ({}));
    setError(body?.error ?? "Não foi possível enviar agora. Tente novamente.");
    setState("idle");
  }

  if (state === "sent") {
    return (
      <p className="rounded-2xl border border-border bg-surface p-5">
        Se houver pedidos nesse e-mail, enviamos um link de acesso para ele. Confira a caixa de
        entrada e o spam. O link vale por 24 horas.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {notice && <p className="text-sm text-red-400">{notice}</p>}
      <p className="text-muted">
        Informe o e-mail usado na compra. Enviamos um link para você ver todos os seus pedidos, sem
        senha.
      </p>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Seu e-mail"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none placeholder:text-muted focus:border-accent"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        disabled={state === "sending"}
        className="rounded-xl bg-accent py-3 font-semibold text-black transition hover:bg-accent-strong disabled:opacity-60"
      >
        {state === "sending" ? "Enviando..." : "Enviar link de acesso"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

export function MyOrders() {
  const token = useSearchParams().get("token");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/my-orders?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setInvalid(body.error ?? "Link inválido ou vencido. Peça um novo.");
        setEmail(body.email);
        setOrders(body.data);
      })
      .catch(() => setInvalid("Não foi possível carregar seus pedidos. Tente novamente."));
  }, [token]);

  if (!token || invalid) return <RequestLink notice={invalid} />;
  if (!orders) return <div className="h-40 animate-pulse rounded-2xl bg-surface" />;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Pedidos de {email}</p>
      {orders.length === 0 && <p className="py-8 text-center text-muted">Nenhum pedido ainda.</p>}
      {orders.map((order) => (
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
