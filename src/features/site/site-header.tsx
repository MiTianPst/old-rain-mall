import Link from "next/link";
import { Suspense } from "react";

import { UserNavigation } from "@/features/auth/user-navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#fbf8f3]/95 backdrop-blur-xl">
      <div className="border-b border-stone-200/70 bg-[#f3eadf]">
        <div className="mx-auto flex min-h-8 max-w-7xl items-center justify-center gap-5 overflow-hidden px-6 text-[11px] text-stone-600 lg:px-8">
          <span>全场包邮</span>
          <span aria-hidden="true">·</span>
          <span>订单保留 2 小时</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">心悦会员最高 9 折</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4 lg:px-8">
        <Link href="/" className="shrink-0 font-serif text-xl font-semibold tracking-[0.14em] text-stone-900">
          旧雨电商
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-stone-600 lg:flex" aria-label="主导航">
          <Link href="/#catalog" className="transition hover:text-amber-800">全部商品</Link>
          <Link href="/#new-products" className="transition hover:text-amber-800">新品</Link>
          <Link href="/#best-selling" className="transition hover:text-amber-800">热销</Link>
          <Link href="/#membership" className="transition hover:text-amber-800">心悦会员</Link>
        </nav>
        <div className="min-w-0 overflow-x-auto">
          <div className="flex min-w-max items-center gap-4 text-sm text-stone-600">
            <Link href="/cart" className="transition hover:text-amber-800">购物车</Link>
            <Link href="/addresses" className="hidden transition hover:text-amber-800 sm:inline">地址</Link>
            <Link href="/orders" className="transition hover:text-amber-800">订单</Link>
            <Suspense fallback={<span className="rounded-full border border-stone-200 px-4 py-2 text-stone-400">读取中…</span>}>
              <UserNavigation />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
