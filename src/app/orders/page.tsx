import Link from "next/link";
import { redirect } from "next/navigation";

import { formatOrderTime, orderStatusLabels } from "@/features/order/presentation";
import { formatCny } from "@/lib/money";
import { getCurrentSession } from "@/server/auth/session";
import { orderService } from "@/server/orders";

export default async function OrdersPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Forders");
  const result = await orderService.listOrders(session.user.id);
  if (!result.ok) redirect("/login?next=%2Forders");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <p className="text-sm tracking-[0.25em] text-amber-800">购买记录</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">我的订单</h1>
      {result.data.length === 0 ? (
        <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
          <p className="text-xl font-medium">还没有订单</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-white hover:bg-amber-800">去逛逛</Link>
        </section>
      ) : (
        <div className="mt-10 space-y-4">
          {result.data.map((order) => (
            <Link key={order.id} href={`/orders/${order.orderNo}`} className="block rounded-3xl border border-stone-200 bg-white p-6 transition hover:border-amber-300 hover:shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-medium">订单号 {order.orderNo}</p><p className="mt-1 text-sm text-stone-500">{formatOrderTime(order.createdAt)}</p></div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">{orderStatusLabels[order.status]}</span>
              </div>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-stone-100 pt-5">
                <p className="text-sm text-stone-600">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join("、")}</p>
                <p className="font-semibold text-amber-800">实付 {formatCny(order.totalCents)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
