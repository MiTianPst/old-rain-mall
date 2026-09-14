import "server-only";

import { and, count, desc, eq, like, max, or } from "drizzle-orm";

import { db } from "@/db";
import { membershipLevelLogs, orders, users } from "@/db/schema";
import type { AdminUserRepository, AdminUserSummary } from "@/server/services/admin-user-service";
import type { MembershipLevel } from "@/lib/membership";

const userSelection = { id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, membershipLevel: users.membershipLevel, lifetimePaidCents: users.lifetimePaidCents, membershipUpgradedAt: users.membershipUpgradedAt, createdAt: users.createdAt };

function summary(row: { id: string; name: string; email: string; role: "USER" | "ADMIN"; status: "ACTIVE" | "FROZEN"; membershipLevel: number; lifetimePaidCents: number; membershipUpgradedAt: Date | null; createdAt: Date; orderCount?: number; lastOrderAt?: Date | null }): AdminUserSummary {
  return { ...row, role: row.role, status: row.status, membershipLevel: row.membershipLevel as MembershipLevel, orderCount: row.orderCount ?? 0, lastOrderAt: row.lastOrderAt ?? null };
}

export const adminUserRepository: AdminUserRepository = {
  async list(input) {
    const conditions = [];
    if (input.search) conditions.push(or(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`))!);
    if (input.role) conditions.push(eq(users.role, input.role));
    if (input.status) conditions.push(eq(users.status, input.status));
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [total]] = await Promise.all([
      db.select({ ...userSelection, orderCount: count(orders.id), lastOrderAt: max(orders.createdAt) }).from(users).leftJoin(orders, eq(orders.userId, users.id)).where(where).groupBy(users.id, users.name, users.email, users.role, users.status, users.membershipLevel, users.lifetimePaidCents, users.membershipUpgradedAt, users.createdAt).orderBy(desc(users.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ value: count() }).from(users).where(where),
    ]);
    return { items: rows.map((row) => summary(row)), total: total?.value ?? 0 };
  },
  async getById(id) {
    const [row] = await db.select({ ...userSelection, orderCount: count(orders.id), lastOrderAt: max(orders.createdAt) }).from(users).leftJoin(orders, eq(orders.userId, users.id)).where(eq(users.id, id)).groupBy(users.id, users.name, users.email, users.role, users.status, users.membershipLevel, users.lifetimePaidCents, users.membershipUpgradedAt, users.createdAt).limit(1);
    if (!row) return null;
    const [logs, recentOrders] = await Promise.all([
      db.select({ id: membershipLevelLogs.id, orderId: membershipLevelLogs.orderId, fromLevel: membershipLevelLogs.fromLevel, toLevel: membershipLevelLogs.toLevel, lifetimePaidCents: membershipLevelLogs.lifetimePaidCents, createdAt: membershipLevelLogs.createdAt }).from(membershipLevelLogs).where(eq(membershipLevelLogs.userId, id)).orderBy(desc(membershipLevelLogs.createdAt)).limit(20),
      db.select({ orderNo: orders.orderNo, status: orders.status, totalCents: orders.totalCents, createdAt: orders.createdAt }).from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)).limit(10),
    ]);
    return { ...summary(row), membershipLogs: logs.map((item) => ({ ...item, fromLevel: item.fromLevel as MembershipLevel, toLevel: item.toLevel as MembershipLevel })), recentOrders };
  },
  async setStatus(input) {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select({ id: users.id, role: users.role, version: users.updatedAt }).from(users).where(eq(users.id, input.targetUserId)).limit(1).for("update");
      if (!user) return { status: "NOT_FOUND" as const };
      if (user.role !== "USER") return { status: "ROLE_FORBIDDEN" as const };
      await tx.update(users).set({ status: input.status, updatedAt: input.now }).where(eq(users.id, input.targetUserId));
      return { status: "UPDATED" as const };
    });
    if (result.status !== "UPDATED") return result;
    const refreshed = await adminUserRepository.getById(input.targetUserId);
    return refreshed ? { status: "UPDATED" as const, user: refreshed } : { status: "CONFLICT" as const };
  },
};
