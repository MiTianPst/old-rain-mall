import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductCard } from "@/features/catalog/product-card";
import { calculateMemberPrice, type MembershipLevel } from "@/lib/membership";
import { getCurrentSession } from "@/server/auth/session";
import { catalogService } from "@/server/catalog";
import { engagementService } from "@/server/engagement";

export const metadata: Metadata = { title: "我的收藏" };

export default async function FavoritesPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Faccount%2Ffavorites");

  const favoriteIds = await engagementService.listFavoriteProductIds(session.user.id);
  const products = (await Promise.all(favoriteIds.map((id) => catalogService.getProductById(id)))).filter(
    (product): product is NonNullable<typeof product> => product !== null,
  );
  const membershipLevel = (session.user.membershipLevel ?? 0) as MembershipLevel;

  return (
    <main className="flex-1 bg-[#f7f3ed] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.24em] text-[#a75e32]">MY FAVORITES</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-stone-900">我的收藏</h1>
            <p className="mt-2 text-sm text-stone-500">把心动好物留在这里，随时回来继续了解。</p>
          </div>
          <Link href="/#catalog" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm text-stone-700 transition hover:border-amber-700 hover:text-amber-800">
            继续逛逛
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const memberPriceCents = calculateMemberPrice(product.priceCents, membershipLevel).discountedAmountCents;
              const activeVariants = product.variants?.filter((variant) => variant.status === "ACTIVE") ?? [];
              return (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    summary: product.summary,
                    priceCents: product.priceCents,
                    compareAtPriceCents: product.compareAtPriceCents ?? null,
                    promotionLabel: product.promotionLabel ?? null,
                    salesCount: product.salesCount ?? 0,
                    stock: product.stock,
                    coverUrl: product.coverUrl,
                    category: product.category,
                    defaultVariantId: product.defaultVariant?.id ?? null,
                    activeVariantCount: activeVariants.length,
                  }}
                  memberPriceCents={memberPriceCents}
                  isAuthenticated
                  isFavorited
                  returnTo="/account/favorites"
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
            <p className="text-xl font-medium text-stone-800">还没有收藏商品</p>
            <p className="mt-2 text-sm text-stone-500">在商品卡片或详情页点击心形图标，收藏你的心动好物。</p>
            <Link href="/#catalog" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white transition hover:bg-amber-800">去发现商品</Link>
          </div>
        )}
      </div>
    </main>
  );
}
