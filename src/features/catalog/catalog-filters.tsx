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
      <form action="/#catalog" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
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
          className="min-h-12 min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-5 text-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
        />
        <label className="flex min-h-12 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm text-stone-600">
          <span className="whitespace-nowrap">¥ 起</span>
          <input
            name="minPrice"
            type="number"
            min="0"
            step="1"
            defaultValue={query.minPrice ?? ""}
            placeholder="最低价"
            className="w-20 min-w-0 bg-transparent outline-none placeholder:text-stone-400"
          />
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm text-stone-600">
          <span className="whitespace-nowrap">¥ 止</span>
          <input
            name="maxPrice"
            type="number"
            min="0"
            step="1"
            defaultValue={query.maxPrice ?? ""}
            placeholder="最高价"
            className="w-20 min-w-0 bg-transparent outline-none placeholder:text-stone-400"
          />
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm text-stone-600">
          <input
            name="inStock"
            type="checkbox"
            value="true"
            defaultChecked={query.inStock}
            className="size-4 accent-amber-700"
          />
          仅看有货
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm text-stone-600">
          <span className="whitespace-nowrap">排序</span>
          <select
            name="sort"
            defaultValue={query.sort}
            className="bg-transparent text-sm outline-none"
          >
            <option value="newest">最新上架</option>
            <option value="sales">销量优先</option>
            <option value="price_asc">价格从低到高</option>
            <option value="price_desc">价格从高到低</option>
          </select>
        </label>
        <button
          type="submit"
          className="min-h-12 rounded-full bg-stone-900 px-7 text-sm font-medium text-white transition hover:bg-amber-800 lg:col-start-5"
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
