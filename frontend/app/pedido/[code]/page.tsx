import { Suspense } from "react";
import { OrderStatus } from "@/components/OrderStatus";

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
      <OrderStatus />
    </Suspense>
  );
}
