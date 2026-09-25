// 首页首屏保留搜索与购物入口，以轻柔的双层渐变衬托右侧真实商品轮播。
import Link from "next/link";

import { HomeHeroCarousel } from "@/features/home/home-hero-carousel";
import type { HomepageProductDto } from "@/server/services/homepage-service";

// 文案区维持服务端渲染，仅轮播交互进入客户端以减小首页脚本范围。
export function HomeHero({ products }: { products: HomepageProductDto[] }) {
  return (
    <section className="border-b border-[#e7e0d5] bg-[radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.86)_0%,transparent_38%),linear-gradient(115deg,#efe2d2_0%,#f9f5ed_50%,#e9eee9_100%)]">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-9 lg:grid-cols-[1fr_0.9fr] lg:gap-14 lg:px-8 lg:py-11">
        <div>
          <p className="text-sm font-medium tracking-[0.28em] text-[#a75e32]">
            旧雨精选 · 好用的科技
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-[1.12] tracking-[-0.045em] text-stone-900 sm:text-5xl lg:text-[3.5rem]">
            科技，让日常
            <br />
            多一点喜欢
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-stone-700">
            从手机、电脑到智能生活设备，挑选真正适合日常使用的科技好物。
          </p>

          <form action="/#catalog" className="mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
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

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="#catalog" className="flex min-h-11 items-center rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition hover:bg-amber-800">
              立即选购
            </Link>
            <Link href="#new-products" className="flex min-h-11 items-center rounded-full border border-stone-400/60 bg-white/50 px-6 text-sm font-medium text-stone-800 transition hover:border-amber-700 hover:text-amber-800">
              查看新品
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HomeHeroCarousel products={products} />
        </div>
      </div>
    </section>
  );
}
