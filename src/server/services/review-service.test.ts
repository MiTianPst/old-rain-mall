import assert from "node:assert/strict";
import test from "node:test";

import { createReviewService, type ReviewRepository } from "./review-service";

function repository(overrides: Partial<ReviewRepository> = {}): ReviewRepository {
  return {
    createReview: async () => ({ status: "CREATED", id: 1 }),
    listPublic: async () => [],
    listByOrder: async () => [],
    listAdmin: async () => ({ items: [], total: 0 }),
    moderate: async () => ({ status: "UPDATED" }),
    ...overrides,
  };
}

test("评价服务要求登录且拦截冻结账户", async () => {
  const service = createReviewService(repository());

  assert.deepEqual(
    await service.createReview({ userId: null, userStatus: undefined, productId: 1, orderItemId: 2, rating: 5, content: "很好" }),
    { ok: false, code: "UNAUTHORIZED", message: "请先登录后评价商品" },
  );
  assert.deepEqual(
    await service.createReview({ userId: "u1", userStatus: "FROZEN", productId: 1, orderItemId: 2, rating: 5, content: "很好" }),
    { ok: false, code: "ACCOUNT_FROZEN", message: "账号已被冻结，暂时无法评价商品" },
  );
});

test("评价服务映射资格与重复评价错误", async () => {
  const notEligible = createReviewService(
    repository({ createReview: async () => ({ status: "NOT_ELIGIBLE" }) }),
  );
  assert.deepEqual(
    await notEligible.createReview({ userId: "u1", userStatus: "ACTIVE", productId: 1, orderItemId: 2, rating: 5, content: "很好" }),
    { ok: false, code: "NOT_ELIGIBLE", message: "仅已完成或已送达的已支付订单可评价" },
  );

  const duplicate = createReviewService(
    repository({ createReview: async () => ({ status: "ALREADY_REVIEWED" }) }),
  );
  assert.deepEqual(
    await duplicate.createReview({ userId: "u1", userStatus: "ACTIVE", productId: 1, orderItemId: 2, rating: 5, content: "很好" }),
    { ok: false, code: "ALREADY_REVIEWED", message: "你已经评价过该商品" },
  );
});

test("新评价提交时直接使用公开状态", async () => {
  let receivedStatus = "";
  const service = createReviewService(
    repository({
      createReview: async (input) => {
        receivedStatus = input.status;
        return { status: "CREATED", id: 3 };
      },
    }),
  );

  const result = await service.createReview({
    userId: "u1",
    userStatus: "ACTIVE",
    productId: 1,
    orderItemId: 2,
    rating: 5,
    content: "很好用",
  });

  assert.equal(receivedStatus, "APPROVED");
  assert.deepEqual(result, { ok: true, reviewId: 3, message: "评价已发布" });
});

test("评价审核服务只允许管理员更新审核状态", async () => {
  const service = createReviewService(repository());
  assert.deepEqual(
    await service.moderate({ adminId: null, reviewId: 1, status: "APPROVED", note: "通过" }),
    { ok: false, code: "FORBIDDEN", message: "没有评价审核权限" },
  );
  assert.deepEqual(
    await service.moderate({ adminId: "admin", reviewId: 1, status: "REJECTED", note: "内容不合适" }),
    { ok: true, message: "评价审核状态已更新" },
  );
});
