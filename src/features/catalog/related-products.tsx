import { ProductCard } from "./product-card";
import { calculateMemberPrice, type MembershipLevel } from "@/lib/membership";
import type { ProductCardDto } from "@/server/services/catalog-service";

export function RelatedProducts({ products, membershipLevel, isAuthenticated }: { products: ProductCardDto[]; membershipLevel: MembershipLevel; isAuthenticated: boolean }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-14 border-t border-stone-200 pt-10" aria-labelledby="related-products-title">
      <p className="text-xs font-medium tracking-[0.2em] text-[#a75e32]">YOU MAY ALSO LIKE</p>
      <h2 id="related-products-title" className="mt-2 text-2xl font-semibold text-stone-900">同类好物</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} memberPriceCents={calculateMemberPrice(product.priceCents, membershipLevel).discountedAmountCents} isAuthenticated={isAuthenticated} compact />
        ))}
      </div>
    </section>
  );
}
