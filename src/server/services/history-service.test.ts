import assert from "node:assert/strict";
import test from "node:test";

import {
  createHistoryService,
  type HistoryRepository,
  type HistoryViewRecord,
} from "./history-service";

function repository(overrides: Partial<HistoryRepository> = {}): HistoryRepository {
  return {
    recordView: async () => ({ status: "RECORDED" }),
    listRecentViews: async () => [],
    clearViews: async () => undefined,
    ...overrides,
  };
}

test("浏览记录只为已登录且未冻结的用户写入", async () => {
  const service = createHistoryService(repository());

  assert.deepEqual(
    await service.recordView({ userId: null, userStatus: undefined, productId: 1 }),
    { ok: false, code: "UNAUTHORIZED", message: "请先登录后记录浏览足迹" },
  );
  assert.deepEqual(
    await service.recordView({ userId: "u1", userStatus: "FROZEN", productId: 1 }),
    { ok: false, code: "ACCOUNT_FROZEN", message: "账号已被冻结，暂时无法记录浏览足迹" },
  );
});

test("商品下架时不写入浏览记录", async () => {
  const service = createHistoryService(
    repository({ recordView: async () => ({ status: "PRODUCT_UNAVAILABLE" }) }),
  );

  assert.deepEqual(
    await service.recordView({ userId: "u1", userStatus: "ACTIVE", productId: 9 }),
    { ok: false, code: "PRODUCT_UNAVAILABLE", message: "商品不存在或已下架" },
  );
});

test("浏览记录服务代理列表和清空操作", async () => {
  let clearedUserId = "";
  const service = createHistoryService(
    repository({
      listRecentViews: async (userId, limit) =>
        [{ userId, limit }] as unknown as HistoryViewRecord[],
      clearViews: async (userId) => {
        clearedUserId = userId;
      },
    }),
  );

  assert.deepEqual(await service.listRecentViews("u1", 30), [{ userId: "u1", limit: 30 }]);
  await service.clearViews("u1");
  assert.equal(clearedUserId, "u1");
  assert.deepEqual(await service.listRecentViews(null, 30), []);
});
