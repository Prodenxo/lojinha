import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lojinha do Leonardo Mohammed",
  description: "Assinaturas e contas digitais com entrega rápida.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-lg text-accent-strong">
                ♛
              </span>
              <span className="text-lg font-semibold tracking-tight">
                Lojinha do <span className="text-accent-strong">Leonardo Mohammed</span>
              </span>
            </Link>
            <Link
              href="/meus-pedidos"
              className="ml-auto shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
            >
              Meus pedidos
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-sm text-muted">
          Lojinha do Leonardo Mohammed
        </footer>
      </body>
    </html>
  );
}
