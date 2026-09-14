import assert from "node:assert/strict";
import { test } from "node:test";

import type { AdminIdentity } from "@/server/admin/auth";
import { adminOrderQuerySchema } from "@/features/admin/order-schema";
import type { AdminOrderRepository } from "@/server/services/admin-order-service";
import { createAdminOrderService } from "@/server/services/admin-order-service";

const admin: AdminIdentity = { id: "admin-1", name: "管理员", role: "ADMIN" };

function repository(overrides: Partial<AdminOrderRepository> = {}): AdminOrderRepository {
  return {
    list: async () => ({ items: [], total: 0 }),
    listForExport: async () => [],
    getByOrderNo: async () => null,
    updateNote: async () => ({ status: "UPDATED" }),
    markShipped: async () => ({ status: "UPDATED" }),
    markCompleted: async () => ({ status: "UPDATED" }),
    ...overrides,
  };
}

test("匿名管理员查询和导出都被拒绝", async () => {
  const service = createAdminOrderService(repository());
  const listResult = await service.list(null, { page: 1 });
  const exportResult = await service.listForExport(null, {});
  assert.equal(listResult.ok, false);
  assert.equal(exportResult.ok, false);
  if (!listResult.ok && !exportResult.ok) {
    assert.equal(listResult.code, "FORBIDDEN");
    assert.equal(exportResult.code, "FORBIDDEN");
  }
});

test("订单备注空白值归一化为 null 并转发筛选条件", async () => {
  let received: unknown;
  const service = createAdminOrderService(repository({
    updateNote: async (input) => { received = input; return { status: "UPDATED" }; },
  }));
  const result = await service.updateNote(admin, { orderNo: "ORDER1234", note: "   " });
  assert.equal(result.ok, true);
  assert.deepEqual(received, { orderNo: "ORDER1234", note: null });
});

test("管理员导出复用筛选条件", async () => {
  let received: unknown;
  const service = createAdminOrderService(repository({
    listForExport: async (input) => { received = input; return []; },
  }));
  const result = await service.listForExport(admin, { search: "u@example.com", status: "PAID", dateFrom: "2026-09-01" });
  assert.equal(result.ok, true);
  assert.deepEqual(received, { search: "u@example.com", status: "PAID", dateFrom: "2026-09-01" });
});

test("订单日期筛选拒绝起始日期晚于结束日期", () => {
  assert.equal(adminOrderQuerySchema.safeParse({ dateFrom: "2026-09-20", dateTo: "2026-09-01", page: "1" }).success, false);
});
