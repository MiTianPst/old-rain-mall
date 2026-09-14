import type { ProductCardDto } from "@/server/services/catalog-service";

export type QuickPurchaseInput = Pick<
  ProductCardDto,
  "slug" | "defaultVariantId" | "activeVariantCount" | "stock"
>;

export function getQuickPurchaseMode(product: QuickPurchaseInput) {
  if (product.stock <= 0 || !product.defaultVariantId) {
    return { type: "SOLD_OUT" as const };
  }
  if (product.activeVariantCount !== 1) {
    return {
      type: "SELECT" as const,
      href: `/products/${product.slug}`,
    };
  }
  return { type: "ADD" as const, variantId: product.defaultVariantId };
}
