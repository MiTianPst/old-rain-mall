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
  compareAtPriceCents: 16900,
  promotionLabel: "限时优惠",
  salesCount: 25,
  stock: 12,
  coverUrl: null,
  category: { id: 2, name: "出行", slug: "travel" },
  variants: [
    {
      id: 12,
      skuCode: "SKU-B",
      name: "深灰 / 加大版",
      attributes: { color: "深灰", size: "加大版" },
      priceCents: 14900,
      stock: 3,
      status: "ARCHIVED" as const,
    },
    {
      id: 11,
      skuCode: "SKU-A",
      name: "暖白 / 标准版",
      attributes: { color: "暖白", size: "标准版" },
      priceCents: 13900,
      stock: 8,
      status: "ACTIVE" as const,
    },
  ],
  images: [
    {
      id: 2,
      url: "/uploads/products/detail.webp",
      altText: "折叠伞细节",
      isPrimary: false,
      sortOrder: 0,
    },
    {
      id: 1,
      url: "/uploads/products/main.webp",
      altText: "旧雨折叠伞主图",
      isPrimary: true,
      sortOrder: 2,
    },
  ],
};

function createRepository(
  overrides: Partial<CatalogRepository> = {},
): CatalogRepository {
  return {
    listProducts: async () => [productRow],
    countProducts: async () => 10,
    findProductById: async () => productRow,
    findProductBySlug: async () => productRow,
    listRelatedProducts: async () => [],
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
    minPrice: null,
    maxPrice: null,
    inStock: false,
    sort: "newest",
    page: 2,
  });

  assert.deepEqual(result, {
    data: [
      {
        id: 7,
        slug: "old-rain-umbrella",
        name: "旧雨折叠伞",
        summary: "晴雨两用",
        priceCents: 13900,
        compareAtPriceCents: 16900,
        promotionLabel: "限时优惠",
        salesCount: 25,
        stock: 8,
        coverUrl: "/uploads/products/main.webp",
        defaultVariantId: 11,
        activeVariantCount: 1,
        category: { id: 2, name: "出行", slug: "travel" },
      },
    ],
    pagination: { page: 2, pageSize: 9, total: 10, totalPages: 2 },
    filters: {
      search: "雨伞",
      category: "travel",
      minPrice: null,
      maxPrice: null,
      inStock: false,
      sort: "newest",
    },
  });
});

test("商品详情返回所有 SKU、默认 SKU 和按主图排序的图片", async () => {
  const service = createCatalogService(createRepository());
  const detail = await service.getProductById(7);

  assert.deepEqual(detail?.variants?.map((item) => item.skuCode), [
    "SKU-B",
    "SKU-A",
  ]);
  assert.equal(
    detail?.images?.find((item) => item.isPrimary)?.url,
    "/uploads/products/main.webp",
  );
  assert.deepEqual(detail?.defaultVariant, {
    id: 11,
    skuCode: "SKU-A",
    name: "暖白 / 标准版",
    attributes: { color: "暖白", size: "标准版" },
    priceCents: 13900,
    stock: 8,
    status: "ACTIVE",
  });
  assert.equal(detail?.priceCents, 13900);
  assert.equal(detail?.stock, 8);
  assert.equal(detail?.coverUrl, "/uploads/products/main.webp");
});

test("属性 JSON 解析失败时使用空对象且不泄露原始错误", async () => {
  const reportedErrors: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    reportedErrors.push(args);
  };

  try {
    const service = createCatalogService(
      createRepository({
        findProductById: async () => ({
          ...productRow,
          variants: [
            {
              ...productRow.variants[1],
              attributes: "{private database details" as unknown as Record<
                string,
                string
              >,
            },
          ],
        }),
      }),
    );

    const detail = await service.getProductById(7);
    assert.deepEqual(detail?.variants?.[0]?.attributes, {});
    assert.equal(reportedErrors.length, 1);
    assert.doesNotMatch(JSON.stringify(detail), /private|SyntaxError/);
    assert.doesNotMatch(JSON.stringify(reportedErrors), /private/);
  } finally {
    console.error = originalConsoleError;
  }
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

test("相关商品服务返回标准卡片并限制推荐数量", async () => {
  const service = createCatalogService(
    createRepository({ listRelatedProducts: async () => [productRow] }),
  );

  const related = await service.listRelatedProducts({
    productId: 7,
    categoryId: 2,
    limit: 4,
  });

  assert.equal(related.length, 1);
  assert.equal(related[0]?.id, 7);
  assert.equal(related[0]?.defaultVariantId, 11);
  assert.equal(related[0]?.activeVariantCount, 1);
});
