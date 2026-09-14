import "server-only";
import { and, asc, count, desc, eq, inArray, like, or, exists, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { afterSales, orderItems, orders, shipments, users } from "@/db/schema";
import type { MembershipLevel } from "@/lib/membership";
import type { AdminOrderRecord, AdminOrderRepository, AdminOrderCommandResult } from "@/server/services/admin-order-service";
const selection = { id: orders.id, orderNo: orders.orderNo, userId: orders.userId, userName: users.name, userEmail: users.email, status: orders.status, paymentStatus: orders.paymentStatus, membershipLevelSnapshot: orders.membershipLevelSnapshot, originalAmountCents: orders.originalAmountCents, discountRateBps: orders.discountRateBps, memberDiscountCents: orders.memberDiscountCents, shippingFeeCents: orders.shippingFeeCents, totalCents: orders.totalCents, adminNote: orders.adminNote, recipientName: orders.recipientName, recipientPhone: orders.recipientPhone, recipientAddress: orders.recipientAddress, expiresAt: orders.expiresAt, paidAt: orders.paidAt, cancelledAt: orders.cancelledAt, shippedAt: orders.shippedAt, completedAt: orders.completedAt, createdAt: orders.createdAt, updatedAt: orders.updatedAt };
async function attachItems(rows: Array<Omit<AdminOrderRecord, "items" | "membershipLevelSnapshot" | "shipment" | "afterSale"> & { membershipLevelSnapshot: number }>) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [itemRows, shipmentRows, saleRows] = await Promise.all([
    db.select({ orderId: orderItems.orderId, productId: orderItems.productId, variantId: orderItems.variantId, productName: orderItems.productName, variantName: orderItems.variantName, variantAttributesJson: orderItems.variantAttributesJson, productCoverUrl: orderItems.productCoverUrl, unitPriceCents: orderItems.unitPriceCents, quantity: orderItems.quantity, subtotalCents: orderItems.subtotalCents }).from(orderItems).where(inArray(orderItems.orderId, ids)).orderBy(asc(orderItems.id)),
    db.select({ orderId: shipments.orderId, shipment: shipments }).from(shipments).where(inArray(shipments.orderId, ids)),
    db.select({ orderId: afterSales.orderId, orderNo: orders.orderNo, sale: afterSales }).from(afterSales).innerJoin(orders, eq(orders.id, afterSales.orderId)).where(inArray(afterSales.orderId, ids)),
  ]);
  const grouped = new Map<number, AdminOrderRecord["items"]>();
  for (const item of itemRows) { const values = grouped.get(item.orderId) ?? []; values.push({ productId: item.productId, variantId: item.variantId, productName: item.productName, variantName: item.variantName, variantAttributesJson: item.variantAttributesJson, productCoverUrl: item.productCoverUrl, unitPriceCents: item.unitPriceCents, quantity: item.quantity, subtotalCents: item.subtotalCents }); grouped.set(item.orderId, values); }
  const shipmentMap = new Map(shipmentRows.map((row) => [row.orderId, { id: row.shipment.id, orderId: row.shipment.orderId, carrier: row.shipment.carrier, trackingNo: row.shipment.trackingNo, status: row.shipment.status, shippedAt: row.shipment.shippedAt, deliveredAt: row.shipment.deliveredAt, updatedAt: row.shipment.updatedAt }]));
  const saleMap = new Map(saleRows.map((row) => [row.orderId, { id: row.sale.id, orderId: row.sale.orderId, orderNo: row.orderNo, userId: row.sale.userId, reason: row.sale.reason, description: row.sale.description, status: row.sale.status, refundAmountCents: row.sale.refundAmountCents, reviewNote: row.sale.reviewNote, reviewedBy: row.sale.reviewedBy, reviewedAt: row.sale.reviewedAt, refundedAt: row.sale.refundedAt, createdAt: row.sale.createdAt, updatedAt: row.sale.updatedAt }]));
  return rows.map((row) => ({ ...row, membershipLevelSnapshot: row.membershipLevelSnapshot as MembershipLevel, items: grouped.get(row.id) ?? [], shipment: shipmentMap.get(row.id) ?? null, afterSale: saleMap.get(row.id) ?? null }));
}
async function mapUpdate(result: { 0: { affectedRows: number } }, orderNo: string): Promise<AdminOrderCommandResult> { if (result[0].affectedRows === 1) return { status: "UPDATED" }; const [exists] = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNo, orderNo)).limit(1); return exists ? { status: "INVALID_STATE" } : { status: "NOT_FOUND" }; }
export const adminOrderRepository: AdminOrderRepository = {
  async list(input) { const conditions = buildWhere(input); const where = conditions.length ? and(...conditions) : undefined; const [rows, [total]] = await Promise.all([db.select(selection).from(orders).innerJoin(users, eq(users.id, orders.userId)).where(where).orderBy(desc(orders.createdAt), desc(orders.id)).limit(input.pageSize).offset((input.page - 1) * input.pageSize), db.select({ value: count() }).from(orders).innerJoin(users, eq(users.id, orders.userId)).where(where)]); return { items: await attachItems(rows), total: total?.value ?? 0 }; },
  async getByOrderNo(orderNo) { const [row] = await db.select(selection).from(orders).innerJoin(users, eq(users.id, orders.userId)).where(eq(orders.orderNo, orderNo)).limit(1); if (!row) return null; return (await attachItems([row]))[0] ?? null; },
  async markShipped(input) { const result = await db.update(orders).set({ status: "SHIPPED", shippedAt: input.now, updatedAt: input.now }).where(and(eq(orders.orderNo, input.orderNo), eq(orders.status, "PAID"), eq(orders.paymentStatus, "SUCCESS"))); return mapUpdate(result, input.orderNo); },
  async markCompleted(input) { const result = await db.update(orders).set({ status: "COMPLETED", completedAt: input.now, updatedAt: input.now }).where(and(eq(orders.orderNo, input.orderNo), eq(orders.status, "DELIVERED"))); return mapUpdate(result, input.orderNo); },
  async updateNote(input) { const result = await db.update(orders).set({ adminNote: input.note }).where(eq(orders.orderNo, input.orderNo)); return mapUpdate(result, input.orderNo); },
  async listForExport(input) { const conditions = buildWhere(input); const rows = await db.select(selection).from(orders).innerJoin(users, eq(users.id, orders.userId)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(orders.createdAt), desc(orders.id)).limit(1000); const full = await attachItems(rows); return full.map((row) => ({ orderNo: row.orderNo, userEmail: row.userEmail, status: row.status, paymentStatus: row.paymentStatus, afterSale: row.afterSale, totalCents: row.totalCents, recipientName: row.recipientName, recipientPhone: row.recipientPhone, shipment: row.shipment, adminNote: row.adminNote, createdAt: row.createdAt })); },
};

function buildWhere(input: { search?: string; status?: string; afterSaleStatus?: string; dateFrom?: string; dateTo?: string }) {
  const conditions = [];
  if (input.search) conditions.push(or(like(orders.orderNo, `%${input.search}%`), like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`))!);
  if (input.status) conditions.push(eq(orders.status, input.status as typeof orders.status.enumValues[number]));
  if (input.afterSaleStatus) conditions.push(exists(db.select({ id: afterSales.id }).from(afterSales).where(and(eq(afterSales.orderId, orders.id), eq(afterSales.status, input.afterSaleStatus as typeof afterSales.status.enumValues[number])))));
  if (input.dateFrom) conditions.push(gte(orders.createdAt, new Date(`${input.dateFrom}T00:00:00.000Z`)));
  if (input.dateTo) conditions.push(lt(orders.createdAt, new Date(new Date(`${input.dateTo}T00:00:00.000Z`).getTime() + 86400000)));
  return conditions;
}
