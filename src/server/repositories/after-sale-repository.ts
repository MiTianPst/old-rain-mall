import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { afterSales, inventoryTransactions, orderItems, orders, payments, productVariants } from "@/db/schema";
import type { AfterSaleRecord, AfterSaleRepository } from "@/server/services/after-sale-service";

function record(row: typeof afterSales.$inferSelect, orderNo: string): AfterSaleRecord {
  return { id: row.id, orderId: row.orderId, orderNo, userId: row.userId, reason: row.reason, description: row.description, status: row.status, refundAmountCents: row.refundAmountCents, reviewNote: row.reviewNote, reviewedBy: row.reviewedBy, reviewedAt: row.reviewedAt, refundedAt: row.refundedAt, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export const afterSaleRepository: AfterSaleRepository = {
  async request(input) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select({ id: orders.id, orderNo: orders.orderNo, status: orders.status, paymentStatus: orders.paymentStatus, totalCents: orders.totalCents }).from(orders).where(and(eq(orders.orderNo, input.orderNo), eq(orders.userId, input.userId))).limit(1).for("update");
      if (!order) return { status: "NOT_FOUND" as const };
      const [existing] = await tx.select().from(afterSales).where(eq(afterSales.orderId, order.id)).limit(1).for("update");
      if (existing) return { status: "ALREADY_REQUESTED" as const, afterSale: record(existing, order.orderNo) };
      const allowed = ["PAID", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"] as string[];
      if (!allowed.includes(order.status) || order.paymentStatus !== "SUCCESS" || order.totalCents <= 0) return { status: "INVALID_STATE" as const };
      const result = await tx.insert(afterSales).values({ orderId: order.id, userId: input.userId, reason: input.reason, description: input.description, status: "REQUESTED", refundAmountCents: order.totalCents, createdAt: input.now, updatedAt: input.now });
      const [created] = await tx.select().from(afterSales).where(eq(afterSales.id, Number(result[0].insertId))).limit(1);
      return created ? { status: "UPDATED" as const, afterSale: record(created, order.orderNo) } : { status: "INVALID_STATE" as const };
    }).catch((error: unknown) => {
      const duplicate = error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY";
      if (duplicate) return this.getByOrderNo({ userId: input.userId, orderNo: input.orderNo }).then((existing) => existing ? { status: "ALREADY_REQUESTED" as const, afterSale: existing } : { status: "INVALID_STATE" as const });
      throw error;
    });
  },

  async review(input) {
    return db.transaction(async (tx) => {
      const [row] = await tx.select({ sale: afterSales, orderNo: orders.orderNo }).from(afterSales).innerJoin(orders, eq(orders.id, afterSales.orderId)).where(eq(afterSales.id, input.afterSaleId)).limit(1).for("update");
      if (!row) return { status: "NOT_FOUND" as const };
      if (row.sale.status !== "REQUESTED") return { status: "INVALID_STATE" as const };
      const status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      await tx.update(afterSales).set({ status, reviewNote: input.reviewNote, reviewedBy: input.adminId, reviewedAt: input.now, updatedAt: input.now }).where(and(eq(afterSales.id, input.afterSaleId), eq(afterSales.status, "REQUESTED")));
      const [updated] = await tx.select().from(afterSales).where(eq(afterSales.id, input.afterSaleId)).limit(1);
      return updated ? { status: "UPDATED" as const, afterSale: record(updated, row.orderNo) } : { status: "INVALID_STATE" as const };
    });
  },

  async refund(input) {
    return db.transaction(async (tx) => {
      const [sale] = await tx.select({ sale: afterSales, order: orders, paymentStatus: payments.status }).from(afterSales).innerJoin(orders, eq(orders.id, afterSales.orderId)).innerJoin(payments, eq(payments.orderId, orders.id)).where(eq(afterSales.id, input.afterSaleId)).limit(1).for("update");
      if (!sale) return { status: "NOT_FOUND" as const };
      if (sale.sale.status === "REFUNDED" || sale.order.status === "REFUNDED") return { status: "ALREADY_REFUNDED" as const, afterSale: record(sale.sale, sale.order.orderNo) };
      if (sale.sale.status !== "APPROVED" || sale.paymentStatus !== "SUCCESS" || sale.sale.refundAmountCents <= 0 || sale.sale.refundAmountCents > sale.order.totalCents) return { status: sale.sale.refundAmountCents > sale.order.totalCents ? "AMOUNT_MISMATCH" as const : "INVALID_STATE" as const };
      await tx.update(afterSales).set({ status: "REFUNDING", updatedAt: input.now }).where(and(eq(afterSales.id, input.afterSaleId), eq(afterSales.status, "APPROVED")));
      const items = await tx.select({ variantId: orderItems.variantId, quantity: orderItems.quantity, stock: productVariants.stock }).from(orderItems).innerJoin(productVariants, eq(orderItems.variantId, productVariants.id)).where(eq(orderItems.orderId, sale.order.id)).orderBy(asc(orderItems.variantId)).for("update");
      const quantities = new Map<number, { quantity: number; stock: number }>();
      for (const item of items) { const current = quantities.get(item.variantId); quantities.set(item.variantId, { quantity: (current?.quantity ?? 0) + item.quantity, stock: item.stock }); }
      for (const [variantId, item] of quantities) {
        await tx.update(productVariants).set({ stock: sql`${productVariants.stock} + ${item.quantity}` }).where(eq(productVariants.id, variantId));
        await tx.insert(inventoryTransactions).values({ variantId, type: "REFUND_RESTORE", quantityDelta: item.quantity, stockBefore: item.stock, stockAfter: item.stock + item.quantity, referenceType: "AFTER_SALE", referenceId: String(input.afterSaleId), idempotencyKey: `AFTER_SALE:${input.afterSaleId}:VARIANT:${variantId}`, operatorUserId: input.adminId, note: "售后退款恢复库存", createdAt: input.now });
      }
      await tx.update(payments).set({ status: "REFUNDED", updatedAt: input.now }).where(eq(payments.orderId, sale.order.id));
      await tx.update(orders).set({ status: "REFUNDED", paymentStatus: "REFUNDED", updatedAt: input.now }).where(eq(orders.id, sale.order.id));
      await tx.update(afterSales).set({ status: "REFUNDED", refundedAt: input.now, updatedAt: input.now }).where(eq(afterSales.id, input.afterSaleId));
      const [updated] = await tx.select().from(afterSales).where(eq(afterSales.id, input.afterSaleId)).limit(1);
      return updated ? { status: "UPDATED" as const, afterSale: record(updated, sale.order.orderNo) } : { status: "INVALID_STATE" as const };
    });
  },

  async getByOrderNo(input) {
    const conditions = [eq(orders.orderNo, input.orderNo)];
    if (input.userId) conditions.push(eq(orders.userId, input.userId));
    const [row] = await db.select({ sale: afterSales, orderNo: orders.orderNo }).from(afterSales).innerJoin(orders, eq(orders.id, afterSales.orderId)).where(and(...conditions)).limit(1);
    return row ? record(row.sale, row.orderNo) : null;
  },
};
