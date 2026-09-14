import Link from "next/link";

import { adminOrderQuerySchema } from "@/features/admin/order-schema";
import { afterSaleStatusLabels, formatOrderTime, orderStatusLabels } from "@/features/order/presentation";
import { formatCny } from "@/lib/money";
import { getAdminSession } from "@/server/admin/auth";
import { adminOrderService } from "@/server/admin-orders";

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const query = adminOrderQuerySchema.parse(await props.searchParams);
  const admin = await getAdminSession();
  const result = await adminOrderService.list(admin, query);
  if (!result.ok) return null;
  const pages = Math.max(1, Math.ceil(result.data.total / 10));
  const buildQuery = (page?: number) => {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.afterSaleStatus) params.set("afterSaleStatus", query.afterSaleStatus);
    if (query.dateFrom) params.set("dateFrom", query.dateFrom);
    if (query.dateTo) params.set("dateTo", query.dateTo);
    if (page) params.set("page", String(page));
    return params;
  };
  const exportHref = `/api/admin/orders/export?${buildQuery().toString()}`;
  const href = (page: number) => `/admin/orders?${buildQuery(page).toString()}`;

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm tracking-[0.2em] text-amber-800">交易履约</p><h1 className="mt-2 text-3xl font-semibold">订单管理</h1></div>
        <a href={exportHref} className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:border-amber-500">导出当前筛选</a>
      </div>
      <form className="mt-6 grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
        <input name="search" defaultValue={query.search} placeholder="订单号、用户名称或邮箱" className="min-w-64 rounded-xl border border-stone-300 px-4 py-2 xl:col-span-2" />
        <select name="status" defaultValue={query.status ?? ""} className="rounded-xl border border-stone-300 px-4 py-2"><option value="">全部订单状态</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select name="afterSaleStatus" defaultValue={query.afterSaleStatus ?? ""} className="rounded-xl border border-stone-300 px-4 py-2"><option value="">全部售后状态</option>{Object.entries(afterSaleStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <label className="text-sm text-stone-500">开始日期<input type="date" name="dateFrom" defaultValue={query.dateFrom} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900" /></label>
        <label className="text-sm text-stone-500">结束日期<input type="date" name="dateTo" defaultValue={query.dateTo} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900" /></label>
        <button className="rounded-full bg-stone-900 px-5 py-2 text-white md:col-span-2 xl:col-span-6 xl:justify-self-end">筛选订单</button>
      </form>

      <div className="mt-6 space-y-3">
        {result.data.items.map((order) => <Link key={order.id} href={`/admin/orders/${order.orderNo}`} className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-5 transition hover:border-amber-300 md:grid-cols-[1fr_1fr_auto_auto] md:items-center"><div><p className="font-medium">{order.orderNo}</p><p className="text-xs text-stone-500">{formatOrderTime(order.createdAt)}</p></div><div><p className="text-sm">{order.userName}</p><p className="text-xs text-stone-500">{order.userEmail}</p></div><span className="rounded-full bg-stone-100 px-3 py-1 text-center text-sm">{orderStatusLabels[order.status]}</span><strong className="text-right text-amber-800">{formatCny(order.totalCents)}</strong></Link>)}
      </div>
      {result.data.items.length === 0 ? <p className="mt-6 rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500">没有符合条件的订单</p> : null}
      <div className="mt-6 flex justify-end gap-3"><Link href={href(Math.max(1, query.page - 1))} className="rounded-full border border-stone-300 px-4 py-2 text-sm">上一页</Link><span className="py-2 text-sm text-stone-500">{query.page} / {pages}</span><Link href={href(Math.min(pages, query.page + 1))} className="rounded-full border border-stone-300 px-4 py-2 text-sm">下一页</Link></div>
    </main>
  );
}
