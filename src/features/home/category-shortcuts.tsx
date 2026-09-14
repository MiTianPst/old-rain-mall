import Link from "next/link";

import type { CategoryDto } from "@/server/services/catalog-service";

export function CategoryShortcuts({ categories }: { categories: CategoryDto[] }) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="category-title" className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.24em] text-[#a75e32]">按兴趣逛</p>
          <h2 id="category-title" className="mt-2 text-2xl font-semibold text-stone-900">热门分类</h2>
        </div>
        <Link href="#catalog" className="text-sm text-stone-500 transition hover:text-amber-800">查看全部 →</Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.slice(0, 10).map((category, index) => (
          <Link
            key={category.id}
            href={`/?category=${encodeURIComponent(category.slug)}#catalog`}
            className="group rounded-[1.5rem] border border-stone-200/80 bg-white p-4 shadow-[0_14px_38px_-32px_rgba(75,55,30,0.5)] transition hover:-translate-y-0.5 hover:border-amber-200"
          >
            <span className={`flex size-11 items-center justify-center rounded-2xl text-lg ${index % 2 === 0 ? "bg-[#f1e6d8] text-[#a75e32]" : "bg-stone-100 text-stone-700"}`}>
              {category.name.slice(0, 1)}
            </span>
            <h3 className="mt-4 font-medium text-stone-900 group-hover:text-amber-800">{category.name}</h3>
            <p className="mt-1 text-xs text-stone-400">{category.productCount} 件好物</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
