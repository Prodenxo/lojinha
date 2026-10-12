"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, saveSession } from "@/lib/auth";

const input =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none placeholder:text-muted focus:border-accent";

type AuthResponse = { token: string; customer: { name: string; email: string } };

export function AuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  // Só aceita destino interno, para o link de login não virar redirecionamento para fora.
  const next = search.get("next")?.startsWith("/") ? search.get("next")! : "/meus-pedidos";

  const [mode, setMode] = useState<"login" | "register">(
    search.get("criar") !== null ? "register" : "login",
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<AuthResponse>(mode === "login" ? "auth/login" : "auth/register", {
        body: mode === "login" ? { email: form.email, password: form.password } : form,
      });
      saveSession({ token: res.token, name: res.customer.name, email: res.customer.email });
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const tab = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-sm font-medium transition ${
      active ? "bg-accent text-black" : "text-muted hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl border border-border p-1">
        <button type="button" className={tab(mode === "login")} onClick={() => setMode("login")}>
          Já tenho conta
        </button>
        <button type="button" className={tab(mode === "register")} onClick={() => setMode("register")}>
          Criar conta
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "register" && (
          <input
            required
            autoComplete="name"
            placeholder="Seu nome"
            className={input}
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        )}
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Seu e-mail"
          className={input}
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
        />
        {mode === "register" && (
          <input
            type="tel"
            required
            autoComplete="tel"
            placeholder="WhatsApp com DDD"
            className={input}
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        )}
        <input
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "register" ? "Crie uma senha (mínimo 8 caracteres)" : "Sua senha"}
          className={input}
          value={form.password}
          onChange={(e) => set({ password: e.target.value })}
        />
        <button
          disabled={busy}
          className="rounded-xl bg-accent py-3 font-semibold text-black transition hover:bg-accent-strong disabled:opacity-60"
        >
          {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {mode === "login" && (
        <Link href="/recuperar-senha" className="text-center text-sm text-muted underline hover:text-foreground">
          Esqueci minha senha
        </Link>
      )}
    </div>
  );
}
