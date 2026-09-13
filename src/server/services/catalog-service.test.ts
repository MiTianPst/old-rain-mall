import assert from "node:assert/strict";
import test from "node:test";

import {
  createCatalogService,
  type CatalogRepository,
} from "./catalog-service";

const productRow = {
  id: 7,
  slug: "old-rain-umbrella",
  name: "旧雨折叠伞",
  summary: "晴雨两用",
  description: "一把适合随身携带的折叠伞。",
  priceCents: 12900,
  stock: 12,
  coverUrl: null,
  category: { id: 2, name: "出行", slug: "travel" },
};

function createRepository(
  overrides: Partial<CatalogRepository> = {},
): CatalogRepository {
  return {
    listProducts: async () => [productRow],
    countProducts: async () => 10,
    findProductById: async () => productRow,
    findProductBySlug: async () => productRow,
    listCategories: async () => [
      {
        id: 2,
        name: "出行",
        slug: "travel",
        description: null,
        productCount: 3,
      },
    ],
    ...overrides,
  };
}

test("商品列表返回固定每页 9 条的分页 DTO", async () => {
  const service = createCatalogService(createRepository());
  const result = await service.listProducts({
    search: "雨伞",
    category: "travel",
    page: 2,
  });

  assert.deepEqual(result, {
    data: [
      {
        id: 7,
        slug: "old-rain-umbrella",
        name: "旧雨折叠伞",
        summary: "晴雨两用",
        priceCents: 12900,
        stock: 12,
        coverUrl: null,
        category: { id: 2, name: "出行", slug: "travel" },
      },
    ],
    pagination: { page: 2, pageSize: 9, total: 10, totalPages: 2 },
    filters: { search: "雨伞", category: "travel" },
  });
});

test("商品详情不存在时保留 null 语义", async () => {
  const service = createCatalogService(
    createRepository({ findProductById: async () => null }),
  );

  assert.equal(await service.getProductById(999), null);
});

test("分类 DTO 返回在售商品数量", async () => {
  const service = createCatalogService(createRepository());

  assert.deepEqual(await service.listCategories(), [
    {
      id: 2,
      name: "出行",
      slug: "travel",
      description: null,
      productCount: 3,
    },
  ]);
});
