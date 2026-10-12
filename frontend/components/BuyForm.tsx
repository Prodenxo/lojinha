"use client";

import { useState } from "react";

const input =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none placeholder:text-muted focus:border-accent";

export function BuyForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, email, phone }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Não foi possível iniciar a compra.");
      // Segue para o pagamento na InfinitePay; ela devolve o cliente para /pedido/<código>.
      window.location.href = body.checkout_url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Seu e-mail"
        className={input}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="tel"
        required
        autoComplete="tel"
        placeholder="WhatsApp com DDD"
        className={input}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        disabled={busy}
        className="rounded-xl bg-accent py-3 font-semibold text-black transition hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? "Gerando pagamento..." : "Comprar agora"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-muted">
        Pagamento por Pix ou cartão via InfinitePay. Depois de pagar, você acompanha a entrega na
        página do pedido e em &quot;Meus pedidos&quot;, com este e-mail.
      </p>
    </form>
  );
}
