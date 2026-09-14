import assert from "node:assert/strict";
import test from "node:test";

import {
  createHomepageService,
  type HomepageProductRecord,
  type HomepageRepository,
} from "./homepage-service";

const baseProduct: HomepageProductRecord = {
  id: 1,
  slug: "test-phone",
  name: "测试手机",
  summary: "轻巧旗舰",
  priceCents: 10_000,
  stock: 8,
  coverUrl: "/phone.webp",
  category: { id: 1, name: "手机", slug: "phones" },
  defaultVariantId: 11,
  activeVariantCount: 1,
  compareAtPriceCents: 12_000,
  promotionLabel: "限时优惠",
  salesCount: 23,
};

function createRepository(
  product: HomepageProductRecord = baseProduct,
  featured: HomepageProductRecord[] = [product],
): HomepageRepository {
  return {
    listFeatured: async () => featured,
    listNewest: async () => [product],
    listBestSelling: async () => [product],
  };
}

test("首页商品按当前会员等级计算参考价", async () => {
  const service = createHomepageService(createRepository());

  const result = await service.getHomepageData(2);

  assert.equal(result.featuredProducts[0]?.memberPriceCents, 9_500);
});

test("无推荐商品时保留新品和热销区域", async () => {
  const service = createHomepageService(createRepository(baseProduct, []));

  const result = await service.getHomepageData(0);

  assert.deepEqual(result.featuredProducts, []);
  assert.equal(result.newProducts.length, 1);
  assert.equal(result.bestSellingProducts.length, 1);
});

test("不高于当前价的划线价不会进入首页 DTO", async () => {
  const service = createHomepageService(
    createRepository({ ...baseProduct, compareAtPriceCents: 9_000 }),
  );

  const result = await service.getHomepageData(0);

  assert.equal(result.featuredProducts[0]?.compareAtPriceCents, null);
});

test("首页每个运营区域最多读取六件商品", async () => {
  const receivedLimits: number[] = [];
  const repository: HomepageRepository = {
    listFeatured: async (limit) => {
      receivedLimits.push(limit);
      return [];
    },
    listNewest: async (limit) => {
      receivedLimits.push(limit);
      return [];
    },
    listBestSelling: async (limit) => {
      receivedLimits.push(limit);
      return [];
    },
  };

  await createHomepageService(repository).getHomepageData(0);

  assert.deepEqual(receivedLimits.sort(), [6, 6, 6]);
});
