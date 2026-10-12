"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/auth";

const input =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none placeholder:text-muted focus:border-accent";
const button =
  "rounded-xl bg-accent py-3 font-semibold text-black transition hover:bg-accent-strong disabled:opacity-60";

export function RecoverPassword() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (token) {
        await api("auth/reset", { body: { token, password: value } });
        // A senha nova já vale; o cliente entra com ela.
        router.push("/entrar");
      } else {
        await api("auth/forgot", { body: { email: value } });
        setSent(true);
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-5">
        Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira a
        caixa de entrada e o spam. O link vale por 1 hora.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-muted">
        {token
          ? "Crie uma nova senha para sua conta."
          : "Informe o e-mail da sua conta. Enviamos um link para você criar uma nova senha."}
      </p>
      {token ? (
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Nova senha (mínimo 8 caracteres)"
          className={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Seu e-mail"
          className={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <button disabled={busy} className={button}>
        {busy ? "Aguarde..." : token ? "Salvar nova senha" : "Enviar link"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
