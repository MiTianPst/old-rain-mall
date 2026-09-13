import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductVisual } from "@/features/catalog/product-visual";
import { CancelOrderButton } from "@/features/order/cancel-order-button";
import { formatDiscountRate, formatOrderTime, orderStatusLabels } from "@/features/order/presentation";
import { getMembershipLabel } from "@/lib/membership";
import { formatCny } from "@/lib/money";
import { MockPaymentButton } from "@/features/payment/mock-payment-button";
import { getCurrentSession } from "@/server/auth/session";
import { orderService } from "@/server/orders";

export default async function OrderDetailPage(props: PageProps<"/orders/[orderNo]">) {
  const { orderNo } = await props.params;
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/orders/${orderNo}`)}`);
  const result = await orderService.getOrder({ userId: session.user.id, orderNo });
  if (!result.ok) notFound();
  const order = result.order;
  const canCancel = order.status === "PENDING_PAYMENT" && order.expiresAt > new Date();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <Link href="/orders" className="text-sm text-amber-800 hover:underline">← 返回订单列表</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm tracking-[0.2em] text-stone-500">订单详情</p><h1 className="mt-2 text-3xl font-semibold">{order.orderNo}</h1><p className="mt-2 text-sm text-stone-500">创建于 {formatOrderTime(order.createdAt)}</p></div>
        <span className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">{orderStatusLabels[order.status]}</span>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-stone-200 bg-white p-6"><h2 className="text-lg font-semibold">收货信息</h2><p className="mt-4 font-medium">{order.recipientName} · {order.recipientPhone}</p><p className="mt-2 text-sm leading-6 text-stone-500">{order.recipientAddress}</p></section>
          <section className="rounded-3xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-semibold">商品快照</h2>
            <div className="mt-5 space-y-4">{order.items.map((item) => <div key={item.productId} className="grid grid-cols-[5rem_1fr_auto] items-center gap-4 border-t border-stone-100 pt-4 first:border-0 first:pt-0"><ProductVisual productId={item.productId} name={item.productName} coverUrl={item.productCoverUrl} /><div><p className="font-medium">{item.productName}</p><p className="mt-1 text-sm text-stone-500">{formatCny(item.unitPriceCents)} × {item.quantity}</p></div><p className="font-medium">{formatCny(item.subtotalCents)}</p></div>)}</div>
          </section>
        </div>
        <aside className="h-fit rounded-3xl bg-white p-6 ring-1 ring-stone-200">
          <p className="text-sm text-amber-800">{getMembershipLabel(order.membershipLevelSnapshot)} · {formatDiscountRate(order.discountRateBps)}计价</p>
          <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-stone-500">商品原价</dt><dd>{formatCny(order.originalAmountCents)}</dd></div><div className="flex justify-between"><dt className="text-stone-500">会员优惠</dt><dd className="text-amber-800">-{formatCny(order.memberDiscountCents)}</dd></div><div className="flex justify-between"><dt className="text-stone-500">运费</dt><dd className="text-emerald-700">包邮</dd></div><div className="flex justify-between border-t border-stone-200 pt-4 text-base"><dt>应付金额</dt><dd className="text-2xl font-semibold text-amber-800">{formatCny(order.totalCents)}</dd></div></dl>
          {order.status === "PENDING_PAYMENT" ? <p className="mt-5 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">支付截止：{formatOrderTime(order.expiresAt)}</p> : null}
          {canCancel ? <MockPaymentButton orderNo={order.orderNo} /> : null}
          {canCancel ? <CancelOrderButton orderNo={order.orderNo} /> : null}
          {order.status === "PAID" ? <p className="mt-5 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">支付成功，会员累计实付金额已更新。</p> : null}
        </aside>
      </div>
    </main>
  );
}
