import Link from "next/link";

import { getAdminSession } from "@/server/admin/auth";
import { adminDashboardService } from "@/server/admin-dashboard";
import { orderStatusLabels } from "@/features/order/presentation";
import { formatCny } from "@/lib/money";

export default async function AdminDashboardPage() {
  const result = await adminDashboardService.get(await getAdminSession());
  if (!result.ok) return null;
  const metrics = result.data;
  const cards = [
    { label: "今日订单", value: metrics.todayOrderCount, href: "/admin/orders" },
    { label: "今日销售额", value: formatCny(metrics.todaySalesCents), href: "/admin/orders" },
    { label: "待支付", value: metrics.pendingPaymentCount, href: "/admin/orders?status=PENDING_PAYMENT" },
    { label: "待发货", value: metrics.pendingShipmentCount, href: "/admin/orders?status=PAID" },
    { label: "售后处理中", value: metrics.activeAfterSaleCount, href: "/admin/orders" },
    { label: "低库存 SKU", value: metrics.lowStockVariantCount, href: "/admin/products" },
  ];

  return (
    <main>
      <p className="text-sm tracking-[0.2em] text-amber-800">运营概览</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">后台管理</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300 hover:shadow-lg">
            <p className="text-sm text-stone-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-stone-900">{card.value}</p>
          </Link>
        ))}
      </div>
      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6"><h2 className="text-lg font-semibold">最近订单</h2><div className="mt-4 space-y-3 text-sm">{metrics.recentOrders.map((order) => <Link key={order.orderNo} href={`/admin/orders/${order.orderNo}`} className="flex flex-wrap justify-between gap-2 border-t border-stone-100 pt-3 hover:text-amber-800"><span>{order.orderNo} · {order.userEmail} · {orderStatusLabels[order.status as keyof typeof orderStatusLabels] ?? order.status}</span><span>{formatCny(order.totalCents)}</span></Link>)}</div></section>
    </main>
  );
}
