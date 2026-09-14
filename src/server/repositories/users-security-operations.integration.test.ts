import assert from "node:assert/strict";
import test from "node:test";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1";

test("MySQL 支持用户冻结、认证限流和管理员审计记录", { skip: !runDatabaseTests }, async () => {
  const [{ db, pool }, schema, drizzle] = await Promise.all([import("@/db"), import("@/db/schema"), import("drizzle-orm")]);
  const userId = `ops-${crypto.randomUUID()}`.slice(0, 36);
  const adminId = `ops-admin-${crypto.randomUUID()}`.slice(0, 36);
  const key = `ops:${crypto.randomUUID()}`;
  let auditId: number | undefined;
  try {
    await db.insert(schema.users).values([{ id: userId, name: "运营测试用户", email: `${userId}@example.test` }, { id: adminId, name: "运营测试管理员", email: `${adminId}@example.test`, role: "ADMIN" }]);
    await db.update(schema.users).set({ status: "FROZEN" }).where(drizzle.eq(schema.users.id, userId));
    await db.insert(schema.rateLimits).values({ key, count: 1, lastRequest: Date.now() });
    const [audit] = await db.insert(schema.auditLogs).values({ operatorUserId: adminId, action: "USER_FREEZE", targetType: "USER", targetId: userId, summary: "冻结普通用户" }).$returningId();
    auditId = audit.id;
    const [stored] = await db.select({ status: schema.users.status }).from(schema.users).where(drizzle.eq(schema.users.id, userId));
    assert.equal(stored.status, "FROZEN");
  } finally {
    if (auditId) await db.delete(schema.auditLogs).where(drizzle.eq(schema.auditLogs.id, auditId));
    await db.delete(schema.rateLimits).where(drizzle.eq(schema.rateLimits.key, key));
    await db.delete(schema.users).where(drizzle.inArray(schema.users.id, [userId, adminId]));
    await pool.end();
  }
});

