import { redirect } from "next/navigation";
import { z } from "zod";

import { CatalogFilters } from "@/features/catalog/catalog-filters";
import { Pagination } from "@/features/catalog/pagination";
import { ProductCard } from "@/features/catalog/product-card";
import { parseCatalogQuery } from "@/features/catalog/query";
import { catalogService } from "@/server/catalog";

export default async function Home({ searchParams }: PageProps<"/">) {
  const rawSearchParams = await searchParams;
  let query;

  try {
    query = parseCatalogQuery(rawSearchParams);
  } catch (error) {
    if (error instanceof z.ZodError) redirect("/");
    throw error;
  }

  const [categories, products] = await Promise.all([
    catalogService.listCategories(),
    catalogService.listProducts(query),
  ]);

  return (
    <main>
      <section className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_right,_#fde7bc,_transparent_42%)]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <p className="text-sm font-medium tracking-[0.3em] text-amber-800">
            旧物新知 · 雨后相逢
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-stone-900 sm:text-7xl">
            为寻常日子，挑一件耐看的好物。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            商品数据已接入 MySQL。你可以搜索、按分类挑选，并查看每件商品的实时库存。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <CatalogFilters categories={categories} query={query} />

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500">为你找到</p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-900">
              {products.pagination.total} 件商品
            </h2>
          </div>
          {query.search ? (
            <p className="text-sm text-stone-500">
              搜索：<span className="text-stone-900">{query.search}</span>
            </p>
          ) : null}
        </div>

        {products.data.length > 0 ? (
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-[2rem] border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
            <p className="text-xl font-medium text-stone-800">
              没有找到相符的商品
            </p>
            <p className="mt-2 text-sm text-stone-500">
              换个关键词或分类再试试。
            </p>
          </div>
        )}

        <Pagination query={query} totalPages={products.pagination.totalPages} />
      </section>
    </main>
  );
}
