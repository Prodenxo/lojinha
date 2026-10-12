"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth";

const style =
  "shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground";

export function AccountLink() {
  const session = useSession();
  return session ? (
    <Link href="/meus-pedidos" className={style}>
      Meus pedidos
    </Link>
  ) : (
    <Link href="/entrar" className={style}>
      Entrar
    </Link>
  );
}
