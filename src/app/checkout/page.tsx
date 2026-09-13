import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/session";

export default async function CheckoutPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Fcheckout");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-16">
      <section className="w-full rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-xl shadow-stone-200/50">
        <p className="text-sm tracking-[0.25em] text-amber-800">下一阶段</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          结算与订单模块即将接入
        </h1>
        <p className="mt-4 leading-7 text-stone-500">
          购物车已经准备好。下一步将实现收货信息、会员折扣、库存扣减和模拟支付。
        </p>
        <Link
          href="/cart"
          className="mt-8 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-amber-800"
        >
          返回购物车
        </Link>
      </section>
    </main>
  );
}
