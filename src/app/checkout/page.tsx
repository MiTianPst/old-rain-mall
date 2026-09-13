import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/features/order/checkout-form";
import { getCurrentSession } from "@/server/auth/session";
import { orderService } from "@/server/orders";

export default async function CheckoutPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Fcheckout");

  const result = await orderService.getCheckout(session.user.id);
  if (!result.ok) redirect("/login?next=%2Fcheckout");
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
          <p className="text-xl font-medium">购物车为空</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-white hover:bg-amber-800">返回商城</Link>
        </section>
      ) : (
        <CheckoutForm checkout={checkout} pricing={result.pricing} />
      )}
    </main>
  );
}
