import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductCard } from "@/features/catalog/product-card";
import { ClearHistoryButton } from "@/features/engagement/clear-history-button";
import { calculateMemberPrice, type MembershipLevel } from "@/lib/membership";
import { getCurrentSession } from "@/server/auth/session";
import { historyService } from "@/server/history";

export const metadata: Metadata = { title: "最近浏览" };

export default async function HistoryPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Faccount%2Fhistory");

  const views = await historyService.listRecentViews(session.user.id, 30);
  const membershipLevel = (session.user.membershipLevel ?? 0) as MembershipLevel;

  return (
    <main className="flex-1 bg-[#f7f3ed] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.24em] text-[#a75e32]">RECENTLY VIEWED</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-stone-900">最近浏览</h1>
            <p className="mt-2 text-sm text-stone-500">最多保留 30 件最近看过的在售商品。</p>
          </div>
          <div className="flex items-center gap-3">
            <ClearHistoryButton />
            <Link href="/#catalog" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm text-stone-700 transition hover:border-amber-700 hover:text-amber-800">继续逛逛</Link>
          </div>
        </div>

        {views.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {views.map((view) => {
              const memberPriceCents = calculateMemberPrice(view.product.priceCents, membershipLevel).discountedAmountCents;
              return (
                <div key={view.product.id}>
                  <ProductCard
                    product={view.product}
                    memberPriceCents={memberPriceCents}
                    isAuthenticated
                    returnTo="/account/history"
                  />
                  <p className="mt-2 px-2 text-xs text-stone-400">
                    浏览 {view.viewCount} 次 · {formatViewedAt(view.lastViewedAt)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
            <p className="text-xl font-medium text-stone-800">还没有浏览记录</p>
            <p className="mt-2 text-sm text-stone-500">去商品详情页看看，之后可以从这里快速找回。</p>
            <Link href="/#catalog" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white transition hover:bg-amber-800">去发现商品</Link>
          </div>
        )}
      </div>
    </main>
  );
}

function formatViewedAt(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
