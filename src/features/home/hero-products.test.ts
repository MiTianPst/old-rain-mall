// 验证首页首屏只展示少量真实、去重且优先有图片的商品。
import assert from "node:assert/strict";
import test from "node:test";

import type { HomepageProductDto } from "@/server/services/homepage-service";
import { selectHeroProducts } from "./hero-products";

// 构造与真实首页 DTO 字段一致的商品，确保断言针对选择结果。
function product(id: number, coverUrl: string | null): HomepageProductDto {
  return {
    id, slug: `product-${id}`, name: `商品 ${id}`, summary: null,
    priceCents: 10000, stock: 10, coverUrl,
    category: { id: 1, name: "手机", slug: "phones" },
    defaultVariantId: id, activeVariantCount: 1,
    compareAtPriceCents: null, promotionLabel: null, salesCount: 0,
    memberPriceCents: 10000,
  };
}

test("首屏优先选择有图片的推荐商品，去重后最多三件", () => {
  const featured = [product(1, null), product(2, "/products/phone.jpg"), product(3, "/products/tablet.jpg")];
  const newest = [product(2, "/products/phone.jpg"), product(4, "/products/watch.jpg"), product(5, "/products/laptop.jpg")];
  assert.deepEqual(selectHeroProducts(featured, newest).map(({ id }) => id), [2, 3, 4]);
});

test("图片不足时仍显示其他推荐商品，空列表不生成幻灯片", () => {
  assert.deepEqual(selectHeroProducts([product(1, null)], []).map(({ id }) => id), [1]);
  assert.deepEqual(selectHeroProducts([], []), []);
});
