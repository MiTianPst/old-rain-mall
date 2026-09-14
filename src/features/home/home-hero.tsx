import Link from "next/link";

import { ProductVisual } from "@/features/catalog/product-visual";
import { formatCny } from "@/lib/money";
import type { HomepageProductDto } from "@/server/services/homepage-service";

export function HomeHero({ product }: { product?: HomepageProductDto }) {
  return (
    <section className="relative overflow-hidden border-b border-[#e8dfd2] bg-[#f6f0e7]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_85%_22%,rgba(217,184,145,0.28),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20">
        <div>
          <p className="text-sm font-medium tracking-[0.28em] text-[#a75e32]">
            旧雨精选 · 好用的科技
          </p>
          <h1 className="mt-5 max-w-2xl font-serif text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-stone-900 sm:text-6xl lg:text-7xl">
            科技，让日常
            <br />
            多一点喜欢
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-stone-600 sm:text-lg">
            从手机、电脑到智能生活设备，挑选真正适合日常使用的科技好物。
          </p>

          <form action="/#catalog" className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label htmlFor="hero-search" className="sr-only">搜索科技好物</label>
            <input
              id="hero-search"
              type="search"
              name="search"
              placeholder="搜索你想要的科技好物"
              className="min-h-12 min-w-0 flex-1 rounded-full border border-white/80 bg-white/90 px-5 text-sm shadow-[0_10px_30px_-20px_rgba(70,50,30,0.45)] outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            />
            <button className="min-h-12 rounded-full bg-[#b86b35] px-7 text-sm font-medium text-white transition hover:bg-[#9d572d]">
              搜索好物
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="#catalog" className="flex min-h-11 items-center rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition hover:bg-amber-800">
              立即选购
            </Link>
            <Link href="#new-products" className="flex min-h-11 items-center rounded-full border border-stone-400/60 bg-white/50 px-6 text-sm font-medium text-stone-800 transition hover:border-amber-700 hover:text-amber-800">
              查看新品
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-500">
            <span>✓ 全场包邮</span>
            <span>✓ 订单保留 2 小时</span>
            <span>✓ 心悦会员最高 9 折</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[3rem] bg-white/35 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/70 p-4 shadow-[0_35px_90px_-45px_rgba(78,55,30,0.55)] backdrop-blur">
            {product ? (
              <>
                <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-[2rem]">
                  <ProductVisual productId={product.id} name={product.name} coverUrl={product.coverUrl} priority large />
                </Link>
                <div className="flex flex-wrap items-end justify-between gap-4 px-3 pb-2 pt-5">
                  <div>
                    <p className="text-xs tracking-[0.16em] text-[#a75e32]">本周主推</p>
                    <h2 className="mt-1 text-xl font-semibold text-stone-900">{product.name}</h2>
                    <p className="mt-1 text-sm text-stone-500">{product.summary}</p>
                  </div>
                  <p className="text-xl font-semibold text-[#b85f2f]">{formatCny(product.priceCents)}</p>
                </div>
              </>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-[2rem] bg-gradient-to-br from-white to-[#e9ddcd] p-12 text-center">
                <p className="font-serif text-4xl leading-tight text-stone-800">发现一件<br />真正好用的科技好物</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
