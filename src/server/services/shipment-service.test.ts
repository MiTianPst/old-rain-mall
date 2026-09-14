import assert from "node:assert/strict";
import test from "node:test";

import type { AdminIdentity } from "@/server/admin/auth";
import { createShipmentService, type ShipmentRepository } from "./shipment-service";

const admin: AdminIdentity = { id: "admin", name: "管理员", role: "ADMIN" };
const shipment = { id: 1, orderId: 2, carrier: "顺丰速运", trackingNo: "SF1234", status: "SHIPPED" as const, shippedAt: new Date(), deliveredAt: null, updatedAt: new Date() };

function repository(overrides: Partial<ShipmentRepository> = {}): ShipmentRepository {
  return {
    create: async () => ({ status: "UPDATED", shipment }),
    advance: async () => ({ status: "UPDATED", shipment: { ...shipment, status: "IN_TRANSIT" } }),
    confirmReceipt: async () => ({ status: "UPDATED", shipment: { ...shipment, status: "DELIVERED", deliveredAt: new Date() } }),
    complete: async () => ({ status: "UPDATED", shipment: { ...shipment, status: "DELIVERED" } }),
    getByOrderNo: async () => shipment,
    ...overrides,
  };
}

test("物流服务要求管理员并校验发货字段", async () => {
  const service = createShipmentService(repository());
  assert.equal((await service.ship(null, { orderNo: "OR123456", carrier: "顺丰", trackingNo: "SF1234" })).code, "FORBIDDEN");
  assert.equal((await service.ship(admin, { orderNo: "bad", carrier: "顺丰", trackingNo: "SF1234" })).code, "INVALID_INPUT");
  assert.equal((await service.ship(admin, { orderNo: "OR123456", carrier: "", trackingNo: "SF1234" })).code, "INVALID_INPUT");
});

test("运输状态只能按顺序推进，用户只能确认自己的订单", async () => {
  const service = createShipmentService(repository({ advance: async () => ({ status: "INVALID_STATE" }) }));
  assert.equal((await service.advance(admin, { orderNo: "OR123456", targetStatus: "DELIVERED" })).code, "INVALID_STATE");
  assert.equal((await service.confirmReceipt({ userId: null, orderNo: "OR123456" })).code, "UNAUTHORIZED");
  assert.equal((await service.confirmReceipt({ userId: "u1", orderNo: "bad" })).code, "INVALID_INPUT");
});

