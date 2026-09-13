import assert from "node:assert/strict";
import test from "node:test";

import {
  createCartService,
  type CartRepository,
} from "./cart-service";

function repositoryWithResult(
  result: Awaited<ReturnType<CartRepository["addItem"]>>,
) {
  let calls = 0;
  const repository: CartRepository = {
    addItem: async () => {
      calls += 1;
      return result;
    },
    listItems: async () => [],
    updateItem: async () => ({ status: "UPDATED", quantity: 1 }),
    removeItem: async () => true,
  } as unknown as CartRepository;
  return { repository, calls: () => calls };
}

test("未登录用户不能写入购物车", async () => {
  const fake = repositoryWithResult({ status: "ADDED", quantity: 1 });
  const service = createCartService(fake.repository);

  assert.deepEqual(
    await service.addItem({ userId: null, variantId: 1, quantity: 1 }),
    { ok: false, code: "UNAUTHORIZED", message: "请先登录后再加入购物车" },
  );
  assert.equal(fake.calls(), 0);
});

test("不可售商品不能写入购物车", async () => {
  const service = createCartService(
    repositoryWithResult({ status: "PRODUCT_UNAVAILABLE" }).repository,
  );

  assert.deepEqual(
    await service.addItem({ userId: "user-1", variantId: 9, quantity: 1 }),
    { ok: false, code: "PRODUCT_UNAVAILABLE", message: "商品不存在或已下架" },
  );
});

test("购物车数量超过库存时拒绝写入", async () => {
  const service = createCartService(
    repositoryWithResult({ status: "STOCK_EXCEEDED", stock: 2 }).repository,
  );

  assert.deepEqual(
    await service.addItem({ userId: "user-1", variantId: 1, quantity: 3 }),
    { ok: false, code: "STOCK_EXCEEDED", message: "库存不足，当前仅剩 2 件" },
  );
});

test("数量不是正整数时拒绝写入", async () => {
  const fake = repositoryWithResult({ status: "ADDED", quantity: 1 });
  const service = createCartService(fake.repository);

  assert.deepEqual(
    await service.addItem({ userId: "user-1", variantId: 1, quantity: 0 }),
    { ok: false, code: "INVALID_INPUT", message: "商品数量必须是正整数" },
  );
  assert.equal(fake.calls(), 0);
});

test("SKU 标识不是正整数时拒绝写入", async () => {
  const fake = repositoryWithResult({ status: "ADDED", quantity: 1 });
  const service = createCartService(fake.repository);

  assert.deepEqual(
    await service.addItem({ userId: "user-1", variantId: 0, quantity: 1 }),
    { ok: false, code: "INVALID_INPUT", message: "商品规格参数不正确" },
  );
  assert.equal(fake.calls(), 0);
});

test("首次写入或重复添加都返回数据库中的最终数量", async () => {
  const first = createCartService(
    repositoryWithResult({ status: "ADDED", quantity: 1 }).repository,
  );
  const repeated = createCartService(
    repositoryWithResult({ status: "ADDED", quantity: 2 }).repository,
  );

  assert.deepEqual(
    await first.addItem({ userId: "user-1", variantId: 1, quantity: 1 }),
    { ok: true, quantity: 1, message: "已加入购物车" },
  );
  assert.deepEqual(
    await repeated.addItem({ userId: "user-1", variantId: 1, quantity: 1 }),
    { ok: true, quantity: 2, message: "已加入购物车，当前共 2 件" },
  );
});

test("更新数量采用精确覆盖并返回最终数量", async () => {
  let receivedQuantity = 0;
  const repository = {
    ...repositoryWithResult({ status: "ADDED", quantity: 1 }).repository,
    updateItem: async (input: { quantity: number }) => {
      receivedQuantity = input.quantity;
      return { status: "UPDATED" as const, quantity: input.quantity };
    },
    removeItem: async () => true,
  } as unknown as CartRepository;
  const service = createCartService(repository);

  assert.deepEqual(
    await service.updateItem({
      userId: "user-1",
      cartItemId: 8,
      quantity: 3,
    }),
    { ok: true, quantity: 3, message: "购物车数量已更新" },
  );
  assert.equal(receivedQuantity, 3);
});

test("更新数量拒绝未登录、超过 99 和不属于当前用户的条目", async () => {
  const repository = {
    ...repositoryWithResult({ status: "ADDED", quantity: 1 }).repository,
    updateItem: async () => ({ status: "ITEM_NOT_FOUND" as const }),
    removeItem: async () => true,
  } as unknown as CartRepository;
  const service = createCartService(repository);

  assert.equal(
    (await service.updateItem({ userId: null, cartItemId: 8, quantity: 2 }))
      .code,
    "UNAUTHORIZED",
  );
  assert.deepEqual(
    await service.updateItem({ userId: "user-1", cartItemId: 8, quantity: 100 }),
    { ok: false, code: "INVALID_INPUT", message: "商品数量必须是 1 到 99 的整数" },
  );
  assert.deepEqual(
    await service.updateItem({ userId: "user-1", cartItemId: 99, quantity: 2 }),
    { ok: false, code: "ITEM_NOT_FOUND", message: "购物车商品不存在" },
  );
});

test("更新数量映射商品不可售和库存不足", async () => {
  const base = repositoryWithResult({ status: "ADDED", quantity: 1 }).repository;
  const unavailable = createCartService({
    ...base,
    updateItem: async () => ({ status: "PRODUCT_UNAVAILABLE" as const }),
    removeItem: async () => true,
  } as unknown as CartRepository);
  const insufficient = createCartService({
    ...base,
    updateItem: async () => ({ status: "STOCK_EXCEEDED" as const, stock: 2 }),
    removeItem: async () => true,
  } as unknown as CartRepository);

  assert.equal(
    (await unavailable.updateItem({ userId: "u", cartItemId: 1, quantity: 1 }))
      .code,
    "PRODUCT_UNAVAILABLE",
  );
  assert.deepEqual(
    await insufficient.updateItem({ userId: "u", cartItemId: 1, quantity: 3 }),
    { ok: false, code: "STOCK_EXCEEDED", message: "库存不足，当前仅剩 2 件" },
  );
});

test("删除只能作用于当前用户拥有的购物车条目", async () => {
  const base = repositoryWithResult({ status: "ADDED", quantity: 1 }).repository;
  const removed = createCartService({
    ...base,
    updateItem: async () => ({ status: "ITEM_NOT_FOUND" as const }),
    removeItem: async () => true,
  } as unknown as CartRepository);
  const missing = createCartService({
    ...base,
    updateItem: async () => ({ status: "ITEM_NOT_FOUND" as const }),
    removeItem: async () => false,
  } as unknown as CartRepository);

  assert.deepEqual(
    await removed.removeItem({ userId: "user-1", cartItemId: 8 }),
    { ok: true, message: "商品已从购物车移除" },
  );
  assert.deepEqual(
    await missing.removeItem({ userId: "user-2", cartItemId: 8 }),
    { ok: false, code: "ITEM_NOT_FOUND", message: "购物车商品不存在" },
  );
});

test("合计只统计分类公开、商品在售且库存充足的条目", async () => {
  const baseProduct = {
    id: 1,
    variantId: 11,
    slug: "product",
    name: "商品",
    variantName: "默认规格",
    variantAttributes: {},
    priceCents: 1000,
    stock: 9,
    coverUrl: null,
    status: "ACTIVE" as const,
    variantStatus: "ACTIVE" as const,
  };
  const repository = {
    ...repositoryWithResult({ status: "ADDED", quantity: 1 }).repository,
    listItems: async () => [
      {
        id: 1,
        quantity: 2,
        product: { ...baseProduct, categoryStatus: "ACTIVE" as const },
      },
      {
        id: 2,
        quantity: 3,
        product: {
          ...baseProduct,
          id: 2,
          categoryStatus: "HIDDEN" as const,
        },
      },
    ],
    updateItem: async () => ({ status: "ITEM_NOT_FOUND" as const }),
    removeItem: async () => false,
  } as unknown as CartRepository;
  const service = createCartService(repository);
  const cart = await service.listItems("user-1");

  assert.equal(cart.data[0]?.available, true);
  assert.equal(cart.data[1]?.available, false);
  assert.equal(cart.totalQuantity, 2);
  assert.equal(cart.totalCents, 2000);
});
