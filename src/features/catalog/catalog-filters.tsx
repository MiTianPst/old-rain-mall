import Link from "next/link";

import type { CategoryDto } from "@/server/services/catalog-service";

import type { CatalogQuery } from "./query";
import { buildCatalogHref } from "./query";

type CatalogFiltersProps = {
  categories: CategoryDto[];
  query: CatalogQuery;
};

export function CatalogFilters({ categories, query }: CatalogFiltersProps) {
  return (
    <div className="space-y-6">
      <form action="/" className="flex flex-col gap-3 sm:flex-row">
        {query.category ? (
          <input type="hidden" name="category" value={query.category} />
        ) : null}
        <label className="sr-only" htmlFor="search">
          搜索商品
        </label>
        <input
          id="search"
          name="search"
          type="search"
          defaultValue={query.search}
          placeholder="搜索商品名称或描述"
          className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
        />
        <button
          type="submit"
          className="rounded-full bg-stone-900 px-7 py-3 text-sm font-medium text-white transition hover:bg-amber-800"
        >
          搜索
        </button>
      </form>

      <nav aria-label="商品分类" className="flex flex-wrap gap-2">
        <Link
          href={buildCatalogHref({ ...query, category: "", page: 1 })}
          aria-current={!query.category ? "page" : undefined}
          className={`rounded-full px-4 py-2 text-sm transition ${
            !query.category
              ? "bg-amber-800 text-white"
              : "border border-stone-300 bg-white text-stone-600 hover:border-amber-700 hover:text-amber-800"
          }`}
        >
          全部商品
        </Link>
        {categories.map((category) => {
          const selected = query.category === category.slug;
          return (
            <Link
              key={category.id}
              href={buildCatalogHref({
                ...query,
                category: category.slug,
                page: 1,
              })}
              aria-current={selected ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selected
                  ? "bg-amber-800 text-white"
                  : "border border-stone-300 bg-white text-stone-600 hover:border-amber-700 hover:text-amber-800"
              }`}
            >
              {category.name} · {category.productCount}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
