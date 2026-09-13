import Link from "next/link";

import { getAdminDashboardCounts } from "@/server/admin/auth";
import { getAdminSession } from "@/server/admin/auth";
import { inventoryService } from "@/server/inventory";

export default async function AdminDashboardPage() {
  const admin = await getAdminSession();
  const [counts, lowStockResult] = await Promise.all([getAdminDashboardCounts(), inventoryService.listLowStock(admin)]);
  const cards = [
    { label: "商品总数", value: counts.products, href: "/admin/products" },
    { label: "分类总数", value: counts.categories, href: "/admin/categories" },
    { label: "订单总数", value: counts.orders, href: "/admin/orders" },
    { label: "待发货订单", value: counts.pendingShipment, href: "/admin/orders?status=PAID" },
    { label: "低库存 SKU", value: lowStockResult.ok ? lowStockResult.data.length : 0, href: "/admin/products" },
  ];

  return (
    <main>
      <p className="text-sm tracking-[0.2em] text-amber-800">运营概览</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">后台管理</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300 hover:shadow-lg">
            <p className="text-sm text-stone-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-stone-900">{card.value}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
