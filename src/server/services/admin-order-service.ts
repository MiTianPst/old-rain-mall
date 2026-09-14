import type { AdminIdentity } from "@/server/admin/auth";
import type { AdminOrderStatus } from "@/features/admin/order-schema";
import type { MembershipLevel } from "@/lib/membership";
import type { AfterSaleRecord } from "@/server/services/after-sale-service";
import type { ShipmentRecord } from "@/server/services/shipment-service";
export type AdminOrderRecord = {
  id: number; orderNo: string; userId: string; userName: string; userEmail: string;
  status: AdminOrderStatus; paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  membershipLevelSnapshot: MembershipLevel; originalAmountCents: number; discountRateBps: number;
  memberDiscountCents: number; shippingFeeCents: number; totalCents: number;
  adminNote: string | null;
  recipientName: string; recipientPhone: string; recipientAddress: string;
  expiresAt: Date; paidAt: Date | null; cancelledAt: Date | null; shippedAt: Date | null; completedAt: Date | null; createdAt: Date; updatedAt: Date;
  items: Array<{ productId: number; variantId: number; productName: string; variantName: string; variantAttributesJson: string; productCoverUrl: string | null; unitPriceCents: number; quantity: number; subtotalCents: number }>;
  shipment: ShipmentRecord | null;
  afterSale: AfterSaleRecord | null;
};
export type AdminOrderCommandResult = { status: "UPDATED" } | { status: "NOT_FOUND" | "INVALID_STATE" };
export interface AdminOrderRepository {
  list(input: { search?: string; status?: AdminOrderStatus; afterSaleStatus?: string; dateFrom?: string; dateTo?: string; page: number; pageSize: number }): Promise<{ items: AdminOrderRecord[]; total: number }>;
  listForExport(input: { search?: string; status?: AdminOrderStatus; afterSaleStatus?: string; dateFrom?: string; dateTo?: string }): Promise<Array<Pick<AdminOrderRecord, "orderNo" | "userEmail" | "status" | "paymentStatus" | "afterSale" | "totalCents" | "recipientName" | "recipientPhone" | "shipment" | "adminNote" | "createdAt">>>;
  updateNote(input: { orderNo: string; note: string | null }): Promise<AdminOrderCommandResult>;
  getByOrderNo(orderNo: string): Promise<AdminOrderRecord | null>;
  markShipped(input: { orderNo: string; now: Date }): Promise<AdminOrderCommandResult>;
  markCompleted(input: { orderNo: string; now: Date }): Promise<AdminOrderCommandResult>;
}
const denied = () => ({ ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" });
function mapCommand(result: AdminOrderCommandResult, message: string) { if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "订单不存在" }; if (result.status === "INVALID_STATE") return { ok: false as const, code: result.status, message: "当前订单状态不允许此操作" }; return { ok: true as const, message }; }
export function createAdminOrderService(repository: AdminOrderRepository, options: { now?: () => Date } = {}) { const now = options.now ?? (() => new Date()); return {
  async list(admin: AdminIdentity | null, input: { search?: string; status?: AdminOrderStatus; afterSaleStatus?: string; dateFrom?: string; dateTo?: string; page: number }) { if (!admin) return denied(); return { ok: true as const, data: await repository.list({ ...input, pageSize: 10 }) }; },
  async listForExport(admin: AdminIdentity | null, input: { search?: string; status?: AdminOrderStatus; afterSaleStatus?: string; dateFrom?: string; dateTo?: string }) { if (!admin) return denied(); return { ok: true as const, data: await repository.listForExport(input) }; },
  async getByOrderNo(admin: AdminIdentity | null, orderNo: string) { if (!admin) return denied(); const order = await repository.getByOrderNo(orderNo); return order ? { ok: true as const, order } : { ok: false as const, code: "NOT_FOUND" as const, message: "订单不存在" }; },
  async markShipped(admin: AdminIdentity | null, orderNo: string) { if (!admin) return denied(); return mapCommand(await repository.markShipped({ orderNo, now: now() }), "订单已标记为已发货"); },
  async markCompleted(admin: AdminIdentity | null, orderNo: string) { if (!admin) return denied(); return mapCommand(await repository.markCompleted({ orderNo, now: now() }), "订单已完成"); },
  async updateNote(admin: AdminIdentity | null, input: { orderNo: string; note: string | null }) { if (!admin) return denied(); const note = input.note?.trim() || null; return mapCommand(await repository.updateNote({ orderNo: input.orderNo, note }), "订单备注已保存"); },
}; }
