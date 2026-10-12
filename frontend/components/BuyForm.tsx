"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useSession } from "@/lib/auth";

const primary =
  "rounded-xl bg-accent py-3 text-center font-semibold text-black transition hover:bg-accent-strong disabled:opacity-60";

export function BuyForm({ slug }: { slug: string }) {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Comprar exige conta: o pedido fica guardado nela.
  if (!session) {
    const next = encodeURIComponent(`/produto/${slug}`);
    return (
      <div className="flex flex-col gap-3">
        <Link href={`/entrar?criar&next=${next}`} className={primary}>
          Criar conta para comprar
        </Link>
        <Link
          href={`/entrar?next=${next}`}
          className="rounded-xl border border-border py-3 text-center font-medium transition hover:border-accent"
        >
          Já tenho conta
        </Link>
      </div>
    );
  }

  async function buy() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ checkout_url: string }>("orders", {
        body: { slug },
        token: session!.token,
      });
      // Segue para o pagamento na InfinitePay; ela devolve o cliente para /pedido/<código>.
      window.location.href = res.checkout_url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button disabled={busy} onClick={buy} className={primary}>
        {busy ? "Gerando pagamento..." : "Comprar agora"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-muted">
        Comprando como {session.email}. Pagamento por Pix ou cartão via InfinitePay. A entrega
        aparece na página do pedido e em &quot;Meus pedidos&quot;.
      </p>
    </div>
  );
}
