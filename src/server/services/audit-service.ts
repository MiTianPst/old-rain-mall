import type { AdminIdentity } from "@/server/admin/auth";

export type AuditTargetType = "CATEGORY" | "PRODUCT" | "VARIANT" | "INVENTORY" | "PRODUCT_IMAGE" | "ORDER" | "SHIPMENT" | "AFTER_SALE" | "USER";
export type AuditInput = { operatorUserId: string; action: string; targetType: AuditTargetType; targetId: string; summary: string };
export interface AuditRepository { insert(input: AuditInput): Promise<void>; list(input: { page: number; pageSize: number; targetType?: AuditTargetType }): Promise<{ items: Array<AuditInput & { id: number; createdAt: Date }>; total: number }>; }

export function createAuditService(repository: AuditRepository) {
  return {
    async record(admin: AdminIdentity | null, input: Omit<AuditInput, "operatorUserId">) {
      if (!admin) return { ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" };
      if (!input.action.trim() || !input.targetId.trim() || input.summary.length < 1 || input.summary.length > 1000 || /(password|token|cookie|secret)/i.test(input.summary)) return { ok: false as const, code: "INVALID_INPUT" as const, message: "审计内容不正确" };
      await repository.insert({ ...input, operatorUserId: admin.id });
      return { ok: true as const };
    },
    async list(admin: AdminIdentity | null, input: Parameters<AuditRepository["list"]>[0]) {
      if (!admin) return { ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" };
      return { ok: true as const, data: await repository.list(input) };
    },
  };
}

