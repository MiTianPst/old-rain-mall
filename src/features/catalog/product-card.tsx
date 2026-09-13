import Link from "next/link";

import { formatCny } from "@/lib/money";
import type { ProductCardDto } from "@/server/services/catalog-service";

import { ProductVisual } from "./product-visual";

export function ProductCard({ product }: { product: ProductCardDto }) {
  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-200/60">
      <Link href={`/products/${product.slug}`} className="block">
        <ProductVisual
          productId={product.id}
          name={product.name}
          coverUrl={product.coverUrl}
        />
        <div className="p-5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-600">
              {product.category.name}
            </span>
            <span
              className={product.stock > 0 ? "text-emerald-700" : "text-rose-700"}
            >
              {product.stock > 0 ? `库存 ${product.stock}` : "暂时售罄"}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-stone-900">
            {product.name}
          </h2>
          <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-stone-500">
            {product.summary ?? "一件值得慢慢了解的旧雨好物。"}
          </p>
          <p className="mt-5 text-lg font-semibold text-amber-800">
            {formatCny(product.priceCents)}
          </p>
        </div>
      </Link>
    </article>
  );
}
