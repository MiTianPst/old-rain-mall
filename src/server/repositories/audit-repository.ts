import "server-only";

import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuditRepository, AuditInput, AuditTargetType } from "@/server/services/audit-service";

export const auditRepository: AuditRepository = {
  async insert(input) { await db.insert(auditLogs).values(input); },
  async list(input) {
    const where = input.targetType ? eq(auditLogs.targetType, input.targetType) : undefined;
    const [rows, [total]] = await Promise.all([
      db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ value: count() }).from(auditLogs).where(where),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        operatorUserId: row.operatorUserId,
        action: row.action,
        targetType: row.targetType as AuditTargetType,
        targetId: row.targetId,
        summary: row.summary,
        createdAt: row.createdAt,
      })) as Array<AuditInput & { id: number; createdAt: Date }>,
      total: total?.value ?? 0,
    };
  },
};
