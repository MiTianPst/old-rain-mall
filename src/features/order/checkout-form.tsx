"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createOrderAction, type OrderActionState } from "@/app/actions/order";
import { ProductVisual } from "@/features/catalog/product-visual";
import { getMembershipLabel } from "@/lib/membership";
import { formatCny } from "@/lib/money";
import type { CheckoutRecord } from "@/server/services/order-service";
import type { OrderPricing } from "./pricing";

const initialState: OrderActionState = { status: "IDLE", message: "" };

export function CheckoutForm({ checkout, pricing }: { checkout: CheckoutRecord; pricing: OrderPricing }) {
  const [state, formAction, pending] = useActionState(createOrderAction, initialState);
  const defaultAddress = checkout.addresses.find((address) => address.isDefault) ?? checkout.addresses[0];
  const hasUnavailableItem = checkout.items.some(
    (item) =>
      item.product.status !== "ACTIVE" ||
      item.product.categoryStatus !== "ACTIVE" ||
      item.product.stock < item.quantity,
  );

  return (
    <form action={formAction} className="mt-10 grid gap-8 lg:grid-cols-[1fr_21rem]">
      <div className="space-y-8">
        <section className="rounded-3xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">收货地址</h2>
            <Link href="/addresses" className="text-sm text-amber-800 hover:underline">管理地址</Link>
          </div>
          <div className="mt-5 space-y-3">
            {checkout.addresses.map((address) => (
              <label key={address.id} className="flex cursor-pointer gap-3 rounded-2xl border border-stone-200 p-4 has-checked:border-amber-700 has-checked:bg-amber-50/60">
                <input
                  type="radio"
                  name="addressId"
                  value={address.id}
                  defaultChecked={address.id === defaultAddress?.id}
                  disabled={pending}
                  required
                  className="mt-1 accent-amber-800"
                />
                <span>
                  <span className="font-medium">{address.recipientName} · {address.recipientPhone}</span>
                  {address.isDefault ? <span className="ml-2 rounded-full bg-stone-900 px-2 py-0.5 text-xs text-white">默认</span> : null}
                  <span className="mt-1 block text-sm leading-6 text-stone-500">
                    {address.province} {address.city} {address.district} {address.detailAddress}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">商品清单</h2>
          <div className="mt-5 space-y-4">
            {checkout.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[5rem_1fr_auto] items-center gap-4 border-t border-stone-100 pt-4 first:border-0 first:pt-0">
                <ProductVisual productId={item.product.id} name={item.product.name} coverUrl={item.product.coverUrl} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.product.name}</p>
                  <p className="mt-1 text-sm text-stone-500">{formatCny(item.product.priceCents)} × {item.quantity}</p>
                </div>
                <p className="font-medium">{formatCny(item.product.priceCents * item.quantity)}</p>
              </div>
            ))}
          </div>
          {hasUnavailableItem ? <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">部分商品已下架或库存不足，请返回购物车调整后再结算。</p> : null}
        </section>
      </div>

      <aside className="h-fit rounded-3xl bg-stone-900 p-6 text-white lg:sticky lg:top-6">
        <p className="text-sm text-amber-300">{getMembershipLabel(checkout.user.membershipLevel)}</p>
        <h2 className="mt-2 text-xl font-semibold">订单金额</h2>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-stone-400">商品原价</dt><dd>{formatCny(pricing.totalCents + pricing.memberDiscountCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-stone-400">会员优惠</dt><dd className="text-amber-300">-{formatCny(pricing.memberDiscountCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-stone-400">运费</dt><dd className="text-emerald-300">包邮</dd></div>
          <div className="flex justify-between border-t border-stone-700 pt-4 text-base"><dt>应付金额</dt><dd className="text-2xl font-semibold text-amber-300">{formatCny(pricing.totalCents)}</dd></div>
        </dl>
        <p aria-live="polite" className="mt-4 min-h-5 text-sm text-rose-300">{state.status === "ERROR" ? state.message : ""}</p>
        <button
          type="submit"
          disabled={pending || hasUnavailableItem}
          className="mt-3 w-full rounded-full bg-amber-300 px-5 py-3 font-medium text-stone-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
        >
          {pending ? "正在提交订单…" : "提交订单"}
        </button>
        <p className="mt-3 text-center text-xs text-stone-500">订单提交后需在两小时内完成支付</p>
      </aside>
    </form>
  );
}
