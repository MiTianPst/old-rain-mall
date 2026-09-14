import { redirect } from "next/navigation";
import { z } from "zod";

import { CatalogFilters } from "@/features/catalog/catalog-filters";
import { Pagination } from "@/features/catalog/pagination";
import { ProductCard } from "@/features/catalog/product-card";
import { parseCatalogQuery } from "@/features/catalog/query";
import { CategoryShortcuts } from "@/features/home/category-shortcuts";
import { CommerceHighlights } from "@/features/home/commerce-highlights";
import { HomeHero } from "@/features/home/home-hero";
import { MembershipPanel } from "@/features/home/membership-panel";
import { ProductShowcase } from "@/features/home/product-showcase";
import { ServicePromises } from "@/features/home/service-promises";
import {
  calculateMemberPrice,
  type MembershipLevel,
} from "@/lib/membership";
import { getCurrentSession } from "@/server/auth/session";
import { catalogService } from "@/server/catalog";
import { engagementService } from "@/server/engagement";
import { homepageService } from "@/server/homepage";

export default async function Home({ searchParams }: PageProps<"/">) {
  const rawSearchParams = await searchParams;
  let query;

  try {
    query = parseCatalogQuery(rawSearchParams);
  } catch (error) {
    if (error instanceof z.ZodError) redirect("/");
    throw error;
  }

  const [categories, products, session] = await Promise.all([
    catalogService.listCategories(),
    catalogService.listProducts(query),
    getCurrentSession(),
  ]);
  const membershipLevel = (session?.user.membershipLevel ?? 0) as MembershipLevel;
  const lifetimePaidCents = session?.user.lifetimePaidCents ?? 0;
  const homepageData = await homepageService.getHomepageData(membershipLevel);
  const homepageProducts = [
    ...homepageData.featuredProducts,
    ...homepageData.newProducts,
    ...homepageData.bestSellingProducts,
  ];
  const favoriteProductIds = new Set(
    await engagementService.listFavoriteProductIds(
      session?.user.id ?? null,
      [...new Set([...homepageProducts.map((item) => item.id), ...products.data.map((item) => item.id)])],
    ),
  );
  const heroProduct =
    homepageData.featuredProducts[0] ?? homepageData.newProducts[0];

  return (
    <main className="overflow-hidden">
      <HomeHero product={heroProduct} />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <ProductShowcase
          id="featured-products"
          eyebrow="旧雨推荐"
          title="本周精选好物"
          description="由商城后台配置的推荐商品，适合想快速挑到重点好物的你。"
          products={homepageData.featuredProducts}
          isAuthenticated={Boolean(session)}
          favoriteProductIds={favoriteProductIds}
        />
      </div>

      <CategoryShortcuts categories={categories} />
      <CommerceHighlights />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <ProductShowcase
          id="new-products"
          eyebrow="刚刚上新"
          title="新鲜科技到店"
          description="按照真实上架时间更新，看看最近加入旧雨的新选择。"
          products={homepageData.newProducts}
          isAuthenticated={Boolean(session)}
          favoriteProductIds={favoriteProductIds}
        />
        <ProductShowcase
          id="best-selling"
          eyebrow="真实热销"
          title="大家正在选择"
          description="根据成功支付且未退款的订单销量排序。"
          products={homepageData.bestSellingProducts}
          isAuthenticated={Boolean(session)}
          favoriteProductIds={favoriteProductIds}
        />
      </div>

      <MembershipPanel
        isAuthenticated={Boolean(session)}
        membershipLevel={membershipLevel}
        lifetimePaidCents={lifetimePaidCents}
      />

      <section id="catalog" className="scroll-mt-28 border-t border-stone-200 bg-[#f7f3ed]">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mb-8">
            <p className="text-xs font-medium tracking-[0.24em] text-[#a75e32]">全部好物</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">慢慢挑一件适合你的</h2>
            <p className="mt-2 text-sm text-stone-500">搜索名称或描述，也可以按分类筛选。</p>
          </div>
          <CatalogFilters categories={categories} query={query} />

          <div className="mt-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-stone-500">为你找到</p>
              <h2 className="mt-1 text-2xl font-semibold text-stone-900">{products.pagination.total} 件商品</h2>
            </div>
            {query.search ? <p className="text-sm text-stone-500">搜索：<span className="text-stone-900">{query.search}</span></p> : null}
          </div>

          {products.data.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.data.map((product) => {
                const { discountedAmountCents } = calculateMemberPrice(
                  product.priceCents,
                  membershipLevel,
                );
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    memberPriceCents={discountedAmountCents}
                    isAuthenticated={Boolean(session)}
                    isFavorited={favoriteProductIds.has(product.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-7 rounded-[2rem] border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
              <p className="text-xl font-medium text-stone-800">没有找到相符的商品</p>
              <p className="mt-2 text-sm text-stone-500">换个关键词或分类再试试。</p>
            </div>
          )}
          <Pagination query={query} totalPages={products.pagination.totalPages} />
        </div>
      </section>

      <ServicePromises />
    </main>
  );
}
