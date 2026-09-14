import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orders, shipments } from "@/db/schema";
import type { ShipmentRecord, ShipmentRepository } from "@/server/services/shipment-service";

function record(row: typeof shipments.$inferSelect): ShipmentRecord {
  return { id: row.id, orderId: row.orderId, carrier: row.carrier, trackingNo: row.trackingNo, status: row.status, shippedAt: row.shippedAt, deliveredAt: row.deliveredAt, updatedAt: row.updatedAt };
}

export const shipmentRepository: ShipmentRepository = {
  async create(input) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select({ id: orders.id, status: orders.status, paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.orderNo, input.orderNo)).limit(1).for("update");
      if (!order) return { status: "NOT_FOUND" as const };
      if (order.status !== "PAID" || order.paymentStatus !== "SUCCESS") return { status: "INVALID_STATE" as const };
      const [existing] = await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1).for("update");
      if (existing) return { status: "ALREADY_EXISTS" as const };
      const result = await tx.insert(shipments).values({ orderId: order.id, carrier: input.carrier, trackingNo: input.trackingNo, status: "SHIPPED", shippedAt: input.now, createdAt: input.now, updatedAt: input.now });
      await tx.update(orders).set({ status: "SHIPPED", shippedAt: input.now, updatedAt: input.now }).where(and(eq(orders.id, order.id), eq(orders.status, "PAID")));
      const [created] = await tx.select().from(shipments).where(eq(shipments.id, Number(result[0].insertId))).limit(1);
      if (!created) return { status: "INVALID_STATE" as const };
      return { status: "UPDATED" as const, shipment: record(created) };
    }).catch((error: unknown) => {
      const duplicate = error && typeof error === "object" && ("code" in error && error.code === "ER_DUP_ENTRY");
      if (duplicate) return { status: "ALREADY_EXISTS" as const };
      throw error;
    });
  },

  async advance(input) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select({ id: orders.id, status: orders.status }).from(orders).where(eq(orders.orderNo, input.orderNo)).limit(1).for("update");
      if (!order) return { status: "NOT_FOUND" as const };
      const [shipment] = await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1).for("update");
      if (!shipment) return { status: "NOT_FOUND" as const };
      const valid = (input.targetStatus === "IN_TRANSIT" && shipment.status === "SHIPPED" && order.status === "SHIPPED") || (input.targetStatus === "DELIVERED" && shipment.status === "IN_TRANSIT" && order.status === "IN_TRANSIT");
      if (!valid) return { status: "INVALID_STATE" as const };
      const deliveredAt = input.targetStatus === "DELIVERED" ? input.now : null;
      await tx.update(shipments).set({ status: input.targetStatus, ...(deliveredAt ? { deliveredAt } : {}), updatedAt: input.now }).where(eq(shipments.id, shipment.id));
      await tx.update(orders).set({ status: input.targetStatus, updatedAt: input.now }).where(eq(orders.id, order.id));
      const [updated] = await tx.select().from(shipments).where(eq(shipments.id, shipment.id)).limit(1);
      return updated ? { status: "UPDATED" as const, shipment: record(updated) } : { status: "INVALID_STATE" as const };
    });
  },

  async confirmReceipt(input) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select({ id: orders.id, status: orders.status }).from(orders).where(and(eq(orders.userId, input.userId), eq(orders.orderNo, input.orderNo))).limit(1).for("update");
      if (!order) return { status: "NOT_FOUND" as const };
      const [shipment] = await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1).for("update");
      if (order.status === "COMPLETED" && shipment?.status === "DELIVERED") return { status: "ALREADY_COMPLETED" as const };
      if (!shipment || !(["SHIPPED", "IN_TRANSIT"] as string[]).includes(shipment.status) || !(["SHIPPED", "IN_TRANSIT"] as string[]).includes(order.status)) return { status: "INVALID_STATE" as const };
      await tx.update(shipments).set({ status: "DELIVERED", deliveredAt: input.now, updatedAt: input.now }).where(eq(shipments.id, shipment.id));
      await tx.update(orders).set({ status: "COMPLETED", completedAt: input.now, updatedAt: input.now }).where(eq(orders.id, order.id));
      const [updated] = await tx.select().from(shipments).where(eq(shipments.id, shipment.id)).limit(1);
      return updated ? { status: "UPDATED" as const, shipment: record(updated) } : { status: "INVALID_STATE" as const };
    });
  },

  async complete(input) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select({ id: orders.id, status: orders.status }).from(orders).where(eq(orders.orderNo, input.orderNo)).limit(1).for("update");
      if (!order) return { status: "NOT_FOUND" as const };
      if (order.status === "COMPLETED") return { status: "ALREADY_COMPLETED" as const };
      if (order.status !== "DELIVERED") return { status: "INVALID_STATE" as const };
      await tx.update(orders).set({ status: "COMPLETED", completedAt: input.now, updatedAt: input.now }).where(eq(orders.id, order.id));
      const [row] = await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1);
      return row ? { status: "UPDATED" as const, shipment: record(row) } : { status: "INVALID_STATE" as const };
    });
  },

  async getByOrderNo(orderNo) {
    const [row] = await db.select({ shipment: shipments }).from(shipments).innerJoin(orders, eq(orders.id, shipments.orderId)).where(eq(orders.orderNo, orderNo)).limit(1);
    return row?.shipment ? record(row.shipment) : null;
  },
};
