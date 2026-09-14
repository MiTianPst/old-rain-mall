import assert from "node:assert/strict";
import test from "node:test";

import type { CatalogService } from "@/server/services/catalog-service";

import { createCatalogHttpHandlers } from "./catalog-http";

const detail = {
  id: 1,
  slug: "umbrella",
  name: "旧雨伞",
  summary: null,
  description: "雨天使用",
  priceCents: 8800,
  stock: 5,
  coverUrl: null,
  category: { id: 1, name: "出行", slug: "travel" },
};

function fakeService(overrides: Partial<CatalogService> = {}): CatalogService {
  return {
    listProducts: async (query) => ({
      data: [],
      pagination: { page: query.page, pageSize: 9, total: 0, totalPages: 0 },
      filters: {
        search: query.search,
        category: query.category,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        inStock: query.inStock,
        sort: query.sort,
      },
    }),
    getProductById: async () => detail,
    getProductBySlug: async () => detail,
    listCategories: async () => [],
    ...overrides,
  };
}

test("商品列表 API 解析筛选参数并返回分页结果", async () => {
  const handlers = createCatalogHttpHandlers(fakeService());
  const response = await handlers.listProducts(
    new Request("http://localhost/api/products?search=%E9%9B%A8&category=travel&page=2"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: [],
    pagination: { page: 2, pageSize: 9, total: 0, totalPages: 0 },
    filters: {
      search: "雨",
      category: "travel",
      minPrice: null,
      maxPrice: null,
      inStock: false,
      sort: "newest",
    },
  });
});

test("商品列表 API 对非法页码返回 400 中文错误", async () => {
  const handlers = createCatalogHttpHandlers(fakeService());
  const response = await handlers.listProducts(
    new Request("http://localhost/api/products?page=0"),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: { code: "INVALID_QUERY", message: "页码必须是大于 0 的整数" },
  });
});

test("商品详情 API 对非法 ID 返回 400", async () => {
  const handlers = createCatalogHttpHandlers(fakeService());
  const response = await handlers.getProduct(
    new Request("http://localhost/api/products/abc"),
    { params: Promise.resolve({ id: "abc" }) },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: { code: "INVALID_ID", message: "商品 ID 必须是正整数" },
  });
});

test("商品详情 API 对不存在商品返回 404", async () => {
  const handlers = createCatalogHttpHandlers(
    fakeService({ getProductById: async () => null }),
  );
  const response = await handlers.getProduct(
    new Request("http://localhost/api/products/999"),
    { params: Promise.resolve({ id: "999" }) },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: "PRODUCT_NOT_FOUND", message: "商品不存在或已下架" },
  });
});

test("分类 API 返回带商品数量的列表", async () => {
  const handlers = createCatalogHttpHandlers(
    fakeService({
      listCategories: async () => [
        {
          id: 1,
          name: "出行",
          slug: "travel",
          description: null,
          productCount: 2,
        },
      ],
    }),
  );
  const response = await handlers.listCategories();

  assert.deepEqual(await response.json(), {
    data: [
      {
        id: 1,
        name: "出行",
        slug: "travel",
        description: null,
        productCount: 2,
      },
    ],
  });
});

test("服务异常时公开 API 返回安全的统一 500 响应", async () => {
  const handlers = createCatalogHttpHandlers(
    fakeService({
      listProducts: async () => {
        throw new Error("private database details");
      },
    }),
    { reportError: () => undefined },
  );
  const response = await handlers.listProducts(
    new Request("http://localhost/api/products"),
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: { code: "INTERNAL_ERROR", message: "服务暂时不可用，请稍后重试" },
  });
});
