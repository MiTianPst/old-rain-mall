import assert from "node:assert/strict";
import test from "node:test";

import type { AdminIdentity } from "@/server/admin/auth";
import { createAfterSaleService, type AfterSaleRepository } from "./after-sale-service";

const admin: AdminIdentity = { id: "admin", name: "管理员", role: "ADMIN" };
const sale = { id: 1, orderId: 2, orderNo: "OR123456", userId: "u1", reason: "商品破损", description: "包装和商品均有破损", status: "REQUESTED" as const, refundAmountCents: 1000, reviewNote: null, reviewedBy: null, reviewedAt: null, refundedAt: null, createdAt: new Date(), updatedAt: new Date() };

function repository(overrides: Partial<AfterSaleRepository> = {}): AfterSaleRepository {
  return { request: async () => ({ status: "UPDATED", afterSale: sale }), review: async () => ({ status: "UPDATED", afterSale: { ...sale, status: "APPROVED", reviewNote: "同意" } }), refund: async () => ({ status: "UPDATED", afterSale: { ...sale, status: "REFUNDED" } }), getByOrderNo: async () => sale, ...overrides };
}

test("售后申请需要登录并校验说明长度", async () => {
  const service = createAfterSaleService(repository());
  assert.equal((await service.request({ userId: null, orderNo: "OR123456", reason: "破损", description: "包装破损" })).code, "UNAUTHORIZED");
  assert.equal((await service.request({ userId: "u1", orderNo: "OR123456", reason: "", description: "包装破损" })).code, "INVALID_INPUT");
  assert.equal((await service.request({ userId: "u1", orderNo: "OR123456", reason: "破损", description: "短" })).code, "INVALID_INPUT");
});

test("售后审核和退款需要管理员", async () => {
  const service = createAfterSaleService(repository());
  assert.equal((await service.review(null, { afterSaleId: 1, decision: "APPROVE", reviewNote: "同意退款" })).code, "FORBIDDEN");
  assert.equal((await service.refund(null, { afterSaleId: 1 })).code, "FORBIDDEN");
  assert.equal((await service.review(admin, { afterSaleId: 1, decision: "APPROVE", reviewNote: "同意退款" })).ok, true);
});

