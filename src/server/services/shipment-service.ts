import type { AdminIdentity } from "@/server/admin/auth";
import { advanceShipmentSchema, createShipmentSchema, orderNoSchema } from "@/features/shipping/schema";

export type ShipmentStatus = "PENDING" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED";
export type ShipmentRecord = {
  id: number;
  orderId: number;
  carrier: string;
  trackingNo: string;
  status: ShipmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  updatedAt: Date;
};
export type ShipmentCommandResult =
  | { status: "UPDATED"; shipment: ShipmentRecord }
  | { status: "NOT_FOUND" | "INVALID_STATE" | "ALREADY_EXISTS" | "ALREADY_COMPLETED" };

export interface ShipmentRepository {
  create(input: { orderNo: string; carrier: string; trackingNo: string; now: Date }): Promise<ShipmentCommandResult>;
  advance(input: { orderNo: string; targetStatus: "IN_TRANSIT" | "DELIVERED"; now: Date }): Promise<ShipmentCommandResult>;
  confirmReceipt(input: { userId: string; orderNo: string; now: Date }): Promise<ShipmentCommandResult>;
  complete(input: { orderNo: string; now: Date }): Promise<ShipmentCommandResult>;
  getByOrderNo(orderNo: string): Promise<ShipmentRecord | null>;
}

const forbidden = () => ({ ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" });
const unauthorized = () => ({ ok: false as const, code: "UNAUTHORIZED" as const, message: "请先登录后操作" });

function mapResult(result: ShipmentCommandResult, successMessage: string) {
  if (result.status === "UPDATED") return { ok: true as const, shipment: result.shipment, message: successMessage };
  if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "订单不存在" };
  if (result.status === "ALREADY_EXISTS") return { ok: false as const, code: result.status, message: "该订单已录入物流" };
  if (result.status === "ALREADY_COMPLETED") return { ok: true as const, message: "订单已完成" };
  return { ok: false as const, code: result.status, message: "当前订单状态不允许此操作" };
}

export function createShipmentService(repository: ShipmentRepository, options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date());
  return {
    async ship(admin: AdminIdentity | null, input: { orderNo: string; carrier: string; trackingNo: string }) {
      if (!admin) return forbidden();
      const parsed = createShipmentSchema.safeParse(input);
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: parsed.error.issues[0]?.message ?? "物流信息不正确" };
      return mapResult(await repository.create({ ...parsed.data, now: now() }), "订单已发货");
    },
    async advance(admin: AdminIdentity | null, input: { orderNo: string; targetStatus: "IN_TRANSIT" | "DELIVERED" }) {
      if (!admin) return forbidden();
      const parsed = advanceShipmentSchema.safeParse(input);
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: "运输状态不正确" };
      return mapResult(await repository.advance({ ...parsed.data, now: now() }), parsed.data.targetStatus === "DELIVERED" ? "物流已送达" : "物流运输中");
    },
    async complete(admin: AdminIdentity | null, orderNo: string) {
      if (!admin) return forbidden();
      const parsed = orderNoSchema.safeParse(orderNo);
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: "订单号格式不正确" };
      return mapResult(await repository.complete({ orderNo: parsed.data, now: now() }), "订单已完成");
    },
    async confirmReceipt(input: { userId: string | null; orderNo: string }) {
      if (!input.userId) return unauthorized();
      const parsed = orderNoSchema.safeParse(input.orderNo);
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: "订单号格式不正确" };
      return mapResult(await repository.confirmReceipt({ userId: input.userId, orderNo: parsed.data, now: now() }), "已确认收货");
    },
    async getByOrderNo(orderNo: string) {
      return repository.getByOrderNo(orderNo);
    },
  };
}

export type ShipmentService = ReturnType<typeof createShipmentService>;

