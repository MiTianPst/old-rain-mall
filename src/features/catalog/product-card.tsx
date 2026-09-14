import Link from "next/link";

import { formatCny } from "@/lib/money";
import type { ProductCardDto } from "@/server/services/catalog-service";

import { FavoriteButton } from "@/features/engagement/favorite-button";
import { ProductVisual } from "./product-visual";
import { QuickPurchase } from "./quick-purchase";

type ProductCardProps = {
  product: ProductCardDto;
  memberPriceCents?: number;
  isAuthenticated?: boolean;
  isFavorited?: boolean;
  returnTo?: string;
  compact?: boolean;
};

export function ProductCard({
  product,
  memberPriceCents,
  isAuthenticated = false,
  isFavorited = false,
  returnTo = "/",
  compact = false,
}: ProductCardProps) {
  const hasMemberPrice =
    memberPriceCents !== undefined && memberPriceCents < product.priceCents;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-white shadow-[0_16px_50px_-36px_rgba(82,65,45,0.5)] transition duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_24px_60px_-34px_rgba(120,78,32,0.45)]">
      <div className="relative">
        <Link href={`/products/${product.slug}`} className="block">
          <ProductVisual
            productId={product.id}
            name={product.name}
            coverUrl={product.coverUrl}
          />
          {product.promotionLabel ? (
            <span className="absolute left-4 top-4 rounded-full bg-[#b86b35] px-3 py-1 text-xs font-medium text-white shadow-sm">
              {product.promotionLabel}
            </span>
          ) : null}
        </Link>
        <div className="absolute right-4 top-4">
          <FavoriteButton
            productId={product.id}
            favorited={isFavorited}
            returnTo={returnTo}
          />
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "p-4" : "p-5"}`}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-stone-500">{product.category.name}</span>
          <span className={product.stock > 0 ? "text-emerald-700" : "text-rose-700"}>
            {product.stock > 0 ? `库存 ${product.stock}` : "暂时售罄"}
          </span>
        </div>

        <Link href={`/products/${product.slug}`} className="mt-3 block">
          <h2 className={`${compact ? "text-base" : "text-lg"} font-semibold tracking-tight text-stone-900 transition group-hover:text-amber-800`}>
            {product.name}
          </h2>
          <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-stone-500">
            {product.summary ?? "一件让日常多一点喜欢的科技好物。"}
          </p>
        </Link>

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-semibold text-[#b85f2f]">
              {formatCny(product.priceCents)}
            </span>
            {product.compareAtPriceCents ? (
              <span className="text-xs text-stone-400 line-through">
                {formatCny(product.compareAtPriceCents)}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex min-h-5 items-center justify-between gap-2 text-xs">
            <span className="text-amber-800">
              {hasMemberPrice
                ? `会员价 ${formatCny(memberPriceCents)}`
                : isAuthenticated
                  ? "当前会员价与售价相同"
                  : "登录查看会员权益"}
            </span>
            {product.salesCount > 0 ? (
              <span className="text-stone-400">已售 {product.salesCount}</span>
            ) : null}
          </div>
          <div className="mt-4">
            <QuickPurchase product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}
