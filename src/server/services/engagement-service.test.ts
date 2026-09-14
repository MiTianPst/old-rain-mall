import assert from "node:assert/strict";
import test from "node:test";

import { createEngagementService, type EngagementRepository } from "./engagement-service";

function repository(overrides: Partial<EngagementRepository> = {}): EngagementRepository {
  return {
    toggleFavorite: async () => ({ status: "ADDED" }),
    listFavoriteProductIds: async () => [1, 2],
    ...overrides,
  };
}

test("收藏服务要求登录并拦截被冻结的账户", async () => {
  const service = createEngagementService(repository());

  assert.deepEqual(
    await service.toggleFavorite({ userId: null, userStatus: undefined, productId: 1 }),
    { ok: false, code: "UNAUTHORIZED", message: "请先登录后收藏商品" },
  );
  assert.deepEqual(
    await service.toggleFavorite({ userId: "u1", userStatus: "FROZEN", productId: 1 }),
    { ok: false, code: "ACCOUNT_FROZEN", message: "账号已被冻结，暂时无法收藏商品" },
  );
});

test("收藏服务返回收藏和取消收藏结果", async () => {
  const service = createEngagementService(
    repository({ toggleFavorite: async () => ({ status: "REMOVED" }) }),
  );

  assert.deepEqual(
    await service.toggleFavorite({ userId: "u1", userStatus: "ACTIVE", productId: 1 }),
    { ok: true, favorited: false, message: "已取消收藏" },
  );
  assert.deepEqual(
    await createEngagementService(repository()).toggleFavorite({
      userId: "u1",
      userStatus: "ACTIVE",
      productId: 1,
    }),
    { ok: true, favorited: true, message: "已加入收藏" },
  );
});

test("商品不可用时收藏服务返回可识别错误", async () => {
  const service = createEngagementService(
    repository({ toggleFavorite: async () => ({ status: "PRODUCT_UNAVAILABLE" }) }),
  );

  assert.deepEqual(
    await service.toggleFavorite({ userId: "u1", userStatus: "ACTIVE", productId: 9 }),
    { ok: false, code: "PRODUCT_UNAVAILABLE", message: "商品不存在或已下架" },
  );
});
