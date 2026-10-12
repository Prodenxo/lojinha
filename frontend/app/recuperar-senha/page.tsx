import { Suspense } from "react";
import { RecoverPassword } from "@/components/RecoverPassword";

export default function RecoverPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-surface" />}>
        <RecoverPassword />
      </Suspense>
    </div>
  );
}
