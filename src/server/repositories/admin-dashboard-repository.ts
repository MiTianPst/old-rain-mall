import "server-only";

import { and, count, eq, gte, inArray, lt, lte, sum, desc } from "drizzle-orm";
import { db } from "@/db";
import { afterSales, orders, payments, productVariants, users } from "@/db/schema";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import type { AdminDashboardRepository, AdminDashboardMetrics } from "@/server/services/admin-dashboard-service";

export const adminDashboardRepository: AdminDashboardRepository = {
  async getMetrics({ start, endExclusive }) {
    const [todayOrders, todaySales, pendingPayment, pendingShipment, activeAfterSale, lowStock, recentOrders] = await Promise.all([
      db.select({ value: count() }).from(orders).where(and(gte(orders.createdAt, start), lt(orders.createdAt, endExclusive))),
      db.select({ value: sum(orders.totalCents) }).from(orders).innerJoin(payments, eq(payments.orderId, orders.id)).where(and(gte(payments.paidAt, start), lt(payments.paidAt, endExclusive), eq(payments.status, "SUCCESS"))),
      db.select({ value: count() }).from(orders).where(eq(orders.status, "PENDING_PAYMENT")),
      db.select({ value: count() }).from(orders).where(eq(orders.status, "PAID")),
      db.select({ value: count() }).from(afterSales).where(inArray(afterSales.status, ["REQUESTED", "APPROVED", "REFUNDING"])),
      db.select({ value: count() }).from(productVariants).where(and(eq(productVariants.status, "ACTIVE"), lte(productVariants.stock, LOW_STOCK_THRESHOLD))),
      db.select({ orderNo: orders.orderNo, userEmail: users.email, status: orders.status, totalCents: orders.totalCents, createdAt: orders.createdAt }).from(orders).innerJoin(users, eq(users.id, orders.userId)).orderBy(desc(orders.createdAt), desc(orders.id)).limit(10),
    ]);
    return { todayOrderCount: todayOrders[0]?.value ?? 0, todaySalesCents: Number(todaySales[0]?.value ?? 0), pendingPaymentCount: pendingPayment[0]?.value ?? 0, pendingShipmentCount: pendingShipment[0]?.value ?? 0, activeAfterSaleCount: activeAfterSale[0]?.value ?? 0, lowStockVariantCount: lowStock[0]?.value ?? 0, recentOrders } satisfies AdminDashboardMetrics;
  },
};

