// 复用真实商品卡片展示首页推荐、新品和热销分区，并控制统一的紧凑间距。
import { ProductCard } from "@/features/catalog/product-card";
import type { HomepageProductDto } from "@/server/services/homepage-service";

type ProductShowcaseProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  products: HomepageProductDto[];
  isAuthenticated: boolean;
  favoriteProductIds?: ReadonlySet<number>;
};

// 无商品时隐藏整个分区，避免首页出现空标题或断裂的版面。
export function ProductShowcase({ id, eyebrow, title, description, products, isAuthenticated, favoriteProductIds }: ProductShowcaseProps) {
  if (products.length === 0) return null;

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t border-stone-200/70 py-10 first:border-t-0 lg:py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-[0.24em] text-[#a75e32]">{eyebrow}</p>
          <h2 id={`${id}-title`} className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">{description}</p>
        </div>
        <a href="#catalog" className="text-sm text-stone-500 transition hover:text-amber-800">浏览全部商品 →</a>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} memberPriceCents={product.memberPriceCents} isAuthenticated={isAuthenticated} isFavorited={favoriteProductIds?.has(product.id)} compact />
        ))}
      </div>
    </section>
  );
}
