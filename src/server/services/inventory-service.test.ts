import assert from "node:assert/strict";
import test from "node:test";

import type { AdminIdentity } from "@/server/admin/auth";
import {
  createInventoryService,
  type InventoryRepository,
} from "./inventory-service";
import {
  createAdminProductService,
  type AdminProductRepository,
} from "./admin-product-service";

const admin: AdminIdentity = { id: "admin-1", name: "管理员", role: "ADMIN" };

function inventoryRepository(
  adjustment: Awaited<ReturnType<InventoryRepository["adjustStock"]>> = {
    status: "ADJUSTED",
    variantId: 1,
    stockBefore: 5,
    stockAfter: 8,
  },
) {
  let adjustmentCalls = 0;
  let lowStockCalls = 0;
  const repository: InventoryRepository = {
    adjustStock: async () => {
      adjustmentCalls += 1;
      return adjustment;
    },
    listLowStock: async () => {
      lowStockCalls += 1;
      return [
        { variantId: 2, productId: 1, productName: "茶", skuCode: "TEA-B", stock: 0 },
        { variantId: 1, productId: 1, productName: "茶", skuCode: "TEA-A", stock: 10 },
      ];
    },
  };
  return { repository, adjustmentCalls: () => adjustmentCalls, lowStockCalls: () => lowStockCalls };
}

test("库存调整拒绝未登录、零数量和结果为负库存", async () => {
  const fake = inventoryRepository();
  const service = createInventoryService(fake.repository);

  assert.equal((await service.adjustStock(null, { variantId: 1, quantityDelta: 1, note: "补货" })).code, "FORBIDDEN");
  assert.equal((await service.adjustStock(admin, { variantId: 1, quantityDelta: 0, note: "盘点" })).code, "INVALID_INPUT");
  assert.equal(fake.adjustmentCalls(), 0);

  const negative = createInventoryService(inventoryRepository({ status: "INSUFFICIENT_STOCK", stock: 2 }).repository);
  assert.deepEqual(
    await negative.adjustStock(admin, { variantId: 1, quantityDelta: -3, note: "盘亏" }),
    { ok: false, code: "INSUFFICIENT_STOCK", message: "库存不足，当前库存为 2" },
  );
});

test("库存调整返回事务写入后的前后库存", async () => {
  const service = createInventoryService(inventoryRepository().repository);
  assert.deepEqual(
    await service.adjustStock(admin, { variantId: 1, quantityDelta: 3, note: "到货入库" }),
    { ok: true, variantId: 1, stockBefore: 5, stockAfter: 8, message: "库存已更新" },
  );
});

test("库存阈值包含 10 且低库存列表仅管理员可读", async () => {
  const fake = inventoryRepository();
  const service = createInventoryService(fake.repository);

  assert.equal(service.isLowStock(0), true);
  assert.equal(service.isLowStock(1), true);
  assert.equal(service.isLowStock(10), true);
  assert.equal(service.isLowStock(11), false);
  const denied = await service.listLowStock(null);
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.code, "FORBIDDEN");
  assert.equal(fake.lowStockCalls(), 0);
  const allowed = await service.listLowStock(admin);
  assert.equal(allowed.ok, true);
  if (allowed.ok) assert.deepEqual(allowed.data.map((item) => item.stock), [0, 10]);
});

test("SKU 更新拒绝唯一可售 SKU 被归档并映射版本冲突", async () => {
  let calls = 0;
  const repository = {
    list: async () => ({ items: [], total: 0 }),
    listCategories: async () => [],
    getById: async () => null,
    create: async () => ({ status: "CREATED" as const, id: 1 }),
    update: async () => ({ status: "UPDATED" as const, id: 1 }),
    archive: async () => ({ status: "ARCHIVED" as const, id: 1 }),
    updateVariants: async () => {
      calls += 1;
      return { status: "CONFLICT" as const };
    },
  } satisfies AdminProductRepository;
  const service = createAdminProductService(repository);
  const onlyArchived = [{ skuCode: "TEA-1", name: "默认", attributes: {}, priceYuan: "10.00", stock: 0, status: "ARCHIVED" as const }];

  assert.equal((await service.updateVariants(admin, { productId: 1, version: 0, variants: onlyArchived })).code, "VALIDATION_ERROR");
  assert.equal(calls, 0);

  const valid = [{ ...onlyArchived[0], status: "ACTIVE" as const }];
  assert.deepEqual(
    await service.updateVariants(admin, { productId: 1, version: 0, variants: valid }),
    { ok: false, code: "CONFLICT", message: "商品已被其他管理员修改，请刷新后重试" },
  );
});

test("SKU 更新拒绝重复编码和普通用户调用", async () => {
  let calls = 0;
  const repository = {
    list: async () => ({ items: [], total: 0 }), listCategories: async () => [], getById: async () => null,
    create: async () => ({ status: "CREATED" as const, id: 1 }), update: async () => ({ status: "UPDATED" as const, id: 1 }), archive: async () => ({ status: "ARCHIVED" as const, id: 1 }),
    updateVariants: async () => { calls += 1; return { status: "UPDATED" as const, id: 1 }; },
  } satisfies AdminProductRepository;
  const service = createAdminProductService(repository);
  const variant = { skuCode: "SAME", name: "默认", attributes: {}, priceYuan: "10.00", stock: 0, status: "ACTIVE" as const };

  assert.equal((await service.updateVariants(null, { productId: 1, version: 0, variants: [variant] })).code, "FORBIDDEN");
  assert.equal((await service.updateVariants(admin, { productId: 1, version: 0, variants: [variant, variant] })).code, "VALIDATION_ERROR");
  assert.equal(calls, 0);
});
