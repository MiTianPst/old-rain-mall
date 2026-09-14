import type { AdminIdentity } from "@/server/admin/auth";

export type AdminDashboardMetrics = { todayOrderCount: number; todaySalesCents: number; pendingPaymentCount: number; pendingShipmentCount: number; activeAfterSaleCount: number; lowStockVariantCount: number; recentOrders: Array<{ orderNo: string; userEmail: string; status: string; totalCents: number; createdAt: Date }> };
export interface AdminDashboardRepository { getMetrics(input: { start: Date; endExclusive: Date }): Promise<AdminDashboardMetrics>; }

export function createAdminDashboardService(repository: AdminDashboardRepository) {
  return {
    async get(admin: AdminIdentity | null, now = new Date()) {
      if (!admin) return { ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" };
      const { getShanghaiDayRange } = await import("@/lib/timezone");
      return { ok: true as const, data: await repository.getMetrics(getShanghaiDayRange(now)) };
    },
  };
}

