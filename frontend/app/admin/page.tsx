"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/format";

type AdminProduct = {
  id: number;
  partner_id: number | null;
  name: string;
  description: string | null;
  category: string;
  emoji: string | null;
  cost_usd: number | null;
  price_brl: number;
  price_locked: number;
  promo_price_brl: number | null;
  featured: number;
  stock: number;
  active: number;
  images: string[];
};

type Draft = {
  id: number | null;
  name: string;
  category: string;
  emoji: string;
  price_brl: string;
  promo_price_brl: string;
  featured: boolean;
  stock: string;
  active: boolean;
  description: string;
  images: string;
};

const EMPTY: Draft = {
  id: null,
  name: "",
  category: "",
  emoji: "",
  price_brl: "",
  promo_price_brl: "",
  featured: false,
  stock: "0",
  active: true,
  description: "",
  images: "",
};

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition hover:border-accent disabled:opacity-50";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (path: string, init: RequestInit = {}, useToken = token) => {
      const res = await fetch(`/api/admin/${path}`, {
        ...init,
        headers: { "content-type": "application/json", "x-admin-token": useToken },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Erro ${res.status}`);
      return body;
    },
    [token],
  );

  const load = useCallback(
    async (useToken = token) => {
      try {
        setProducts((await call("products", {}, useToken)).data);
        setToken(useToken);
        setAuthed(true);
        localStorage.setItem("admin-token", useToken);
      } catch (err) {
        setAuthed(false);
        setMessage((err as Error).message);
      }
    },
    [call, token],
  );

  useEffect(() => {
    const saved = localStorage.getItem("admin-token");
    // Restaura a sessão salva; o setState só acontece depois do fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) load(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(label: string, action: () => Promise<string | void>) {
    setBusy(true);
    setMessage(`${label}...`);
    try {
      setMessage((await action()) ?? `${label}: ok`);
      await load();
    } catch (err) {
      setMessage(`${label}: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const sync = () =>
    run("Sincronização", async () => {
      const r = await call("sync", { method: "POST" });
      return `Sincronizado: ${r.total} itens (${r.created} novos, ${r.updated} atualizados)`;
    });

  const balance = () =>
    run("Saldo", async () => {
      const u = await call("partner/usage");
      return `Saldo no fornecedor: ${u.balance} ${u.currency}`;
    });

  const save = () =>
    run("Salvar", async () => {
      if (!draft) return;
      const body = JSON.stringify({
        name: draft.name.trim(),
        category: draft.category.trim() || "Outros",
        emoji: draft.emoji.trim() || null,
        price_brl: Number(draft.price_brl.replace(",", ".")),
        promo_price_brl: draft.promo_price_brl.trim()
          ? Number(draft.promo_price_brl.replace(",", "."))
          : null,
        featured: draft.featured ? 1 : 0,
        stock: Number(draft.stock),
        active: draft.active ? 1 : 0,
        description: draft.description.trim() || null,
        images: draft.images.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      await call(draft.id ? `products/${draft.id}` : "products", {
        method: draft.id ? "PUT" : "POST",
        body,
      });
      setDraft(null);
    });

  const remove = (p: AdminProduct) => {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    run("Excluir", async () => {
      await call(`products/${p.id}`, { method: "DELETE" });
    });
  };

  const toggle = (p: AdminProduct) =>
    run("Atualizar", async () => {
      await call(`products/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: p.active ? 0 : 1 }),
      });
    });

  const toggleFeatured = (p: AdminProduct) =>
    run("Destaque", async () => {
      await call(`products/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ featured: p.featured ? 0 : 1 }),
      });
    });

  const edit = (p: AdminProduct) =>
    setDraft({
      id: p.id,
      name: p.name,
      category: p.category,
      emoji: p.emoji ?? "",
      price_brl: String(p.price_brl),
      promo_price_brl: p.promo_price_brl != null ? String(p.promo_price_brl) : "",
      featured: !!p.featured,
      stock: String(p.stock),
      active: !!p.active,
      description: p.description ?? "",
      images: p.images.join("\n"),
    });

  if (!authed) {
    return (
      <form
        className="mx-auto flex max-w-sm flex-col gap-3 pt-16"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <h1 className="text-xl font-semibold">Admin</h1>
        <input
          type="password"
          className={input}
          placeholder="Token de admin"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button className="rounded-lg bg-accent py-2 font-semibold text-black">Entrar</button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </form>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Produtos ({products.length})</h1>
        <Link href="/admin/pedidos" className={button}>
          Pedidos
        </Link>
        <button className={button} disabled={busy} onClick={balance}>
          Ver saldo
        </button>
        <button className={button} disabled={busy} onClick={sync}>
          Sincronizar fornecedor
        </button>
        <button
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black"
          onClick={() => setDraft(EMPTY)}
        >
          Novo produto
        </button>
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}

      {draft && (
        <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Nome
            <input className={input} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">
            Categoria
            <input className={input} value={draft.category} onChange={(e) => set({ category: e.target.value })} />
          </label>
          <label className="text-sm">
            Preço (R$)
            <input className={input} inputMode="decimal" value={draft.price_brl} onChange={(e) => set({ price_brl: e.target.value })} />
          </label>
          <label className="text-sm">
            Preço promocional (R$), opcional
            <input className={input} inputMode="decimal" value={draft.promo_price_brl} onChange={(e) => set({ promo_price_brl: e.target.value })} />
          </label>
          <label className="text-sm">
            Estoque
            <input className={input} inputMode="numeric" value={draft.stock} onChange={(e) => set({ stock: e.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">
            Descrição
            <textarea className={input} rows={4} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">
            Fotos (uma URL por linha)
            <textarea className={input} rows={3} value={draft.images} onChange={(e) => set({ images: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} />
            Visível na loja
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.featured} onChange={(e) => set({ featured: e.target.checked })} />
            Em destaque
          </label>
          <div className="flex justify-end gap-2">
            <button className={button} onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              disabled={busy || !draft.name.trim() || !draft.price_brl}
              onClick={save}
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Custo</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Estoque</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={`border-t border-border ${p.active ? "" : "opacity-50"}`}>
                <td className="p-3">
                  <button
                    className={`mr-2 text-base ${p.featured ? "text-accent-strong" : "text-muted hover:text-accent"}`}
                    title={p.featured ? "Tirar do destaque" : "Colocar em destaque"}
                    disabled={busy}
                    onClick={() => toggleFeatured(p)}
                  >
                    {p.featured ? "★" : "☆"}
                  </button>
                  {p.name}
                  {!p.partner_id && <span className="ml-2 text-xs text-accent">manual</span>}
                </td>
                <td className="p-3">{p.category}</td>
                <td className="p-3">{p.cost_usd != null ? `US$ ${p.cost_usd.toFixed(2)}` : "-"}</td>
                <td className="p-3 whitespace-nowrap">
                  {formatBRL(p.price_brl)}
                  {p.promo_price_brl != null && (
                    <span className="ml-1 text-accent-strong">→ {formatBRL(p.promo_price_brl)}</span>
                  )}
                  {!!p.price_locked && <span title="Preço fixado manualmente"> 🔒</span>}
                </td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3 whitespace-nowrap">
                  <button className="mr-3 hover:text-accent" onClick={() => edit(p)}>
                    Editar
                  </button>
                  <button className="mr-3 hover:text-accent" disabled={busy} onClick={() => toggle(p)}>
                    {p.active ? "Ocultar" : "Mostrar"}
                  </button>
                  <button className="hover:text-red-400" disabled={busy} onClick={() => remove(p)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
