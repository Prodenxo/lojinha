import { MyOrders } from "@/components/MyOrders";

export default function MyOrdersPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Meus pedidos</h1>
      <MyOrders />
    </div>
  );
}
