import Link from "next/link";
import { Suspense } from "react";

import { UserNavigation } from "@/features/auth/user-navigation";
import { catalogService } from "@/server/catalog";

import { buildHeaderCategoryLinks } from "./header-navigation";

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.7]">
      <path d="M7 3.5h10a2 2 0 0 1 2 2v15l-3-2-4 2-4-2-3 2v-15a2 2 0 0 1 2-2Z" />
      <path d="M8.5 8h7M8.5 12h5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.7]">
      <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6" />
      <circle cx="9.5" cy="19.5" r="1" />
      <circle cx="17" cy="19.5" r="1" />
    </svg>
  );
}

async function HeaderCategoryNavigation() {
  const links = await catalogService
    .listCategories()
    .then(buildHeaderCategoryLinks)
    .catch((error: unknown) => {
      console.error("[site-header] 分类导航读取失败", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return [];
    });

  return (
    <nav aria-label="商品分类" className="flex min-w-max items-center gap-1">
      <Link href="/#catalog" className="rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-amber-800">
        全部商品
      </Link>
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          title={`${link.productCount} 件商品`}
          className="rounded-full px-3 py-2 text-xs text-stone-600 transition hover:bg-[#f1e5d7] hover:text-amber-900"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#fbf8f3]/95 shadow-[0_12px_35px_-30px_rgba(45,32,20,0.55)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="旧雨电商首页">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#aa6033] font-serif text-xl text-white shadow-[0_10px_25px_-12px_rgba(132,72,35,0.8)] transition group-hover:-rotate-3">
            雨
          </span>
          <span>
            <span className="block font-serif text-lg font-semibold tracking-[0.12em] text-stone-900 sm:text-xl">旧雨电商</span>
            <span className="hidden text-[9px] tracking-[0.22em] text-stone-400 sm:block">科技与生活好物</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-stone-600 lg:flex" aria-label="主导航">
          <Link href="/#featured-products" className="border-b border-transparent py-5 transition hover:border-amber-700 hover:text-amber-900">精选</Link>
          <Link href="/#new-products" className="border-b border-transparent py-5 transition hover:border-amber-700 hover:text-amber-900">新品</Link>
          <Link href="/#best-selling" className="border-b border-transparent py-5 transition hover:border-amber-700 hover:text-amber-900">热销</Link>
          <Link href="/#membership" className="border-b border-transparent py-5 transition hover:border-amber-700 hover:text-amber-900">心悦会员</Link>
        </nav>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Link href="/orders" className="hidden min-h-10 items-center gap-2 rounded-full px-3 text-xs text-stone-600 transition hover:bg-stone-100 hover:text-amber-900 sm:flex">
            <OrderIcon />
            <span className="hidden xl:inline">订单</span>
          </Link>
          <Link href="/cart" className="flex min-h-10 items-center gap-2 rounded-full px-3 text-xs text-stone-600 transition hover:bg-stone-100 hover:text-amber-900">
            <CartIcon />
            <span className="hidden xl:inline">购物车</span>
          </Link>
          <Suspense fallback={<span className="h-10 w-20 animate-pulse rounded-full bg-stone-100" />}>
            <UserNavigation />
          </Suspense>
        </div>
      </div>

      <div className="border-t border-stone-200/70 bg-white/65">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="order-2 overflow-x-auto pb-0.5 md:order-1 md:pb-0">
            <Suspense fallback={<span className="block h-8 w-72 animate-pulse rounded-full bg-stone-100" />}>
              <HeaderCategoryNavigation />
            </Suspense>
          </div>
          <form action="/#catalog" className="order-1 flex min-h-10 w-full items-center rounded-full border border-stone-200 bg-[#f7f3ed] px-4 transition focus-within:border-amber-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-100 md:order-2 md:w-80">
            <SearchIcon />
            <label htmlFor="header-search" className="sr-only">搜索商品</label>
            <input id="header-search" name="search" type="search" placeholder="搜索手机、电脑或生活好物" className="min-w-0 flex-1 bg-transparent px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400" />
            <button type="submit" className="text-xs font-medium text-[#a75e32] hover:text-amber-900">搜索</button>
          </form>
        </div>
      </div>
    </header>
  );
}
