"use client";

import { useMemo, useSyncExternalStore } from "react";

export type Session = { token: string; name: string; email: string };

const KEY = "customer-session";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const notify = () => listeners.forEach((listener) => listener());

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  notify();
}

export function clearSession() {
  localStorage.removeItem(KEY);
  notify();
}

// Sessão do cliente logado (null no servidor e para visitante).
export function useSession(): Session | null {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }, [raw]);
}

// Chamada à API da loja; devolve o corpo ou lança o erro em português vindo do backend.
export async function api<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  const res = await fetch(`/api/${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && options.token) clearSession();
  if (!res.ok) throw new Error(body.error ?? "Algo deu errado. Tente novamente.");
  return body as T;
}
