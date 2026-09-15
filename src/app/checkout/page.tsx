import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CheckoutForm } from "@/features/order/checkout-form";
import { parseCheckoutQuery } from "@/features/order/checkout-query";
import { getCurrentSession } from "@/server/auth/session";
import { orderService } from "@/server/orders";

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const rawSearchParams = await searchParams;
  let buyNowVariantId: number | undefined;
  try {
    ({ buyNowVariantId } = parseCheckoutQuery(rawSearchParams));
  } catch (error) {
    if (error instanceof z.ZodError) redirect("/checkout");
    throw error;
  }

  const session = await getCurrentSession();
  const checkoutPath = buyNowVariantId
    ? `/checkout?buyNowVariantId=${buyNowVariantId}`
    : "/checkout";
  if (!session) redirect(`/login?next=${encodeURIComponent(checkoutPath)}`);

  const result = await orderService.getCheckout(session.user.id, { buyNowVariantId });
  if (!result.ok) redirect(`/login?next=${encodeURIComponent(checkoutPath)}`);
  const checkout = result.data;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <p className="text-sm tracking-[0.25em] text-amber-800">确认选物</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">结算</h1>
      {checkout.addresses.length === 0 ? (
        <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
          <p className="text-xl font-medium">请先添加收货地址</p>
          <Link href="/addresses/new" className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-white hover:bg-amber-800">新增地址</Link>
        </section>
      ) : checkout.items.length === 0 ? (
        <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
          <p className="text-xl font-medium">{buyNowVariantId ? "当前商品暂不可购买" : "购物车为空"}</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-white hover:bg-amber-800">返回商城</Link>
        </section>
      ) : (
        <CheckoutForm checkout={checkout} pricing={result.pricing} buyNowVariantId={buyNowVariantId} />
      )}
    </main>
  );
}
