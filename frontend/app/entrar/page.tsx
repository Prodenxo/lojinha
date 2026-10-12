import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Sua conta</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
