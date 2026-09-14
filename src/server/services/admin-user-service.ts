import type { AdminIdentity } from "@/server/admin/auth";
import type { MembershipLevel } from "@/lib/membership";

export type UserStatus = "ACTIVE" | "FROZEN";
export type UserRole = "USER" | "ADMIN";
export type MembershipLogDto = { id: number; orderId: number; fromLevel: MembershipLevel; toLevel: MembershipLevel; lifetimePaidCents: number; createdAt: Date };
export type AdminUserOrderSummary = { orderNo: string; status: string; totalCents: number; createdAt: Date };
export type AdminUserSummary = { id: string; name: string; email: string; role: UserRole; status: UserStatus; membershipLevel: MembershipLevel; lifetimePaidCents: number; membershipUpgradedAt: Date | null; orderCount: number; lastOrderAt: Date | null; createdAt: Date };
export type AdminUserDetail = AdminUserSummary & { membershipLogs: MembershipLogDto[]; recentOrders: AdminUserOrderSummary[] };
export type UserStatusResult = { status: "UPDATED"; user: AdminUserSummary } | { status: "NOT_FOUND" | "ROLE_FORBIDDEN" | "CONFLICT" };

export interface AdminUserRepository {
  list(input: { search?: string; role?: UserRole; status?: UserStatus; page: number; pageSize: number }): Promise<{ items: AdminUserSummary[]; total: number }>;
  getById(id: string): Promise<AdminUserDetail | null>;
  setStatus(input: { adminId: string; targetUserId: string; status: UserStatus; now: Date }): Promise<UserStatusResult>;
}

const denied = () => ({ ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" });

export function createAdminUserService(repository: AdminUserRepository) {
  return {
    async list(admin: AdminIdentity | null, input: Parameters<AdminUserRepository["list"]>[0]) {
      if (!admin) return denied();
      return { ok: true as const, data: await repository.list(input) };
    },
    async get(admin: AdminIdentity | null, id: string) {
      if (!admin) return denied();
      const user = await repository.getById(id);
      return user ? { ok: true as const, user } : { ok: false as const, code: "NOT_FOUND" as const, message: "用户不存在" };
    },
    async setStatus(admin: AdminIdentity | null, input: { targetUserId: string; status: UserStatus }) {
      if (!admin) return denied();
      if (input.targetUserId === admin.id) return { ok: false as const, code: "SELF_FORBIDDEN" as const, message: "不能冻结自己的管理员账号" };
      const result = await repository.setStatus({ ...input, adminId: admin.id, now: new Date() });
      if (result.status === "UPDATED") return { ok: true as const, user: result.user, message: result.user.status === "FROZEN" ? "用户已冻结" : "用户已解冻" };
      if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "用户不存在" };
      if (result.status === "ROLE_FORBIDDEN") return { ok: false as const, code: result.status, message: "不能修改其他管理员账号" };
      return { ok: false as const, code: result.status, message: "用户状态已变化，请刷新后重试" };
    },
  };
}

