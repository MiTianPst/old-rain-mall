"use client";

// 在首页首屏展示真实主推商品，提供手动切换和尊重减少动态效果的自动轮播。
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductVisual } from "@/features/catalog/product-visual";
import { formatCny } from "@/lib/money";
import type { HomepageProductDto } from "@/server/services/homepage-service";

// 交互只包住商品卡片，首页的数据获取和其他模块仍留在服务端组件。
export function HomeHeroCarousel({ products }: { products: HomepageProductDto[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // 仅在多件商品、用户未交互且系统允许动态效果时自动前进，并在状态变化时清理计时器。
  useEffect(() => {
    if (products.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % products.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, products.length]);

  // 按钮切换始终可用，不受自动播放或减少动态效果设置影响。
  function move(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + products.length) % products.length);
  }

  const product = products[activeIndex];
  return (
    <div
      role="region"
      aria-roledescription="轮播图"
      aria-label="主推商品"
      className="w-full max-w-[470px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {product ? (
        <div key={product.id} className="hero-slide-enter overflow-hidden rounded-[2rem] border border-[#e8dfd2] bg-white p-3 shadow-[0_24px_64px_-40px_rgba(79,54,33,0.42)]">
          <Link href={`/products/${product.slug}`} className="group block overflow-hidden rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
            <ProductVisual productId={product.id} name={product.name} coverUrl={product.coverUrl} priority={activeIndex === 0} large />
          </Link>
          <div className="flex items-end justify-between gap-4 px-2 pb-2 pt-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#9b5a31]">旧雨主推</p>
              <Link href={`/products/${product.slug}`} className="mt-1 block truncate text-lg font-semibold text-stone-900 hover:text-[#9b5a31]">{product.name}</Link>
              {product.summary ? <p className="mt-1 line-clamp-1 text-sm text-stone-600">{product.summary}</p> : null}
            </div>
            <p className="shrink-0 text-lg font-semibold text-[#9b5a31]">{formatCny(product.priceCents)}</p>
          </div>
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-[2rem] border border-[#e8dfd2] bg-white px-8 text-center text-stone-600">精选商品即将上架</div>
      )}
      {products.length > 1 ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">更多精选，轻松切换</p>
          <div className="flex gap-2">
            <button type="button" aria-label="上一件商品" onClick={() => move(-1)} className="flex size-10 items-center justify-center rounded-full border border-stone-300 bg-white text-lg text-stone-800 transition hover:border-[#9b5a31] hover:text-[#9b5a31] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">←</button>
            <button type="button" aria-label="下一件商品" onClick={() => move(1)} className="flex size-10 items-center justify-center rounded-full border border-stone-300 bg-white text-lg text-stone-800 transition hover:border-[#9b5a31] hover:text-[#9b5a31] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">→</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
