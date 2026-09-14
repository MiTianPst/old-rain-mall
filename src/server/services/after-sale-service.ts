import type { AdminIdentity } from "@/server/admin/auth";
import { afterSaleRefundSchema, afterSaleRequestSchema, afterSaleReviewSchema } from "@/features/after-sale/schema";

export type AfterSaleStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDING" | "REFUNDED";
export type AfterSaleRecord = {
  id: number;
  orderId: number;
  orderNo: string;
  userId: string;
  reason: string;
  description: string;
  status: AfterSaleStatus;
  refundAmountCents: number;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
export type AfterSaleCommandResult =
  | { status: "UPDATED"; afterSale: AfterSaleRecord }
  | { status: "ALREADY_REQUESTED"; afterSale: AfterSaleRecord }
  | { status: "ALREADY_REFUNDED"; afterSale: AfterSaleRecord }
  | { status: "NOT_FOUND" | "INVALID_STATE" | "AMOUNT_MISMATCH" };

export interface AfterSaleRepository {
  request(input: { userId: string; orderNo: string; reason: string; description: string; now: Date }): Promise<AfterSaleCommandResult>;
  review(input: { afterSaleId: number; adminId: string; decision: "APPROVE" | "REJECT"; reviewNote: string; now: Date }): Promise<AfterSaleCommandResult>;
  refund(input: { afterSaleId: number; adminId: string; now: Date }): Promise<AfterSaleCommandResult>;
  getByOrderNo(input: { userId?: string; orderNo: string }): Promise<AfterSaleRecord | null>;
}

const unauthorized = () => ({ ok: false as const, code: "UNAUTHORIZED" as const, message: "请先登录后操作售后" });
const forbidden = () => ({ ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" });

export function createAfterSaleService(repository: AfterSaleRepository) {
  return {
    async request(input: { userId: string | null; orderNo: string; reason: string; description: string; userStatus?: "ACTIVE" | "FROZEN" }) {
      if (!input.userId) return unauthorized();
      if (input.userStatus === "FROZEN") return { ok: false as const, code: "ACCOUNT_FROZEN" as const, message: "账号已被冻结，暂时无法执行此操作" };
      const parsed = afterSaleRequestSchema.safeParse(input);
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: parsed.error.issues[0]?.message ?? "售后信息不正确" };
      const result = await repository.request({ ...parsed.data, userId: input.userId, now: new Date() });
      if (result.status === "UPDATED") return { ok: true as const, afterSale: result.afterSale, message: "售后申请已提交" };
      if (result.status === "ALREADY_REQUESTED") return { ok: true as const, afterSale: result.afterSale, message: "该订单已提交过售后申请" };
      if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "订单不存在" };
      return { ok: false as const, code: result.status, message: "当前订单状态不支持售后申请" };
    },
    async review(admin: AdminIdentity | null, input: { afterSaleId: number; decision: "APPROVE" | "REJECT"; reviewNote: string }) {
      if (!admin) return forbidden();
      const parsed = afterSaleReviewSchema.safeParse(input);
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: parsed.error.issues[0]?.message ?? "审核信息不正确" };
      const result = await repository.review({ ...parsed.data, adminId: admin.id, now: new Date() });
      if (result.status === "UPDATED") return { ok: true as const, afterSale: result.afterSale, message: parsed.data.decision === "APPROVE" ? "售后已审核通过" : "售后已拒绝" };
      if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "售后记录不存在" };
      return { ok: false as const, code: result.status, message: "当前售后状态不允许审核" };
    },
    async refund(admin: AdminIdentity | null, input: { afterSaleId: number }) {
      if (!admin) return forbidden();
      const parsed = afterSaleRefundSchema.safeParse(input);
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: "售后编号不正确" };
      const result = await repository.refund({ afterSaleId: parsed.data.afterSaleId, adminId: admin.id, now: new Date() });
      if (result.status === "UPDATED") return { ok: true as const, afterSale: result.afterSale, message: "退款已完成，库存已恢复（本地模拟）" };
      if (result.status === "ALREADY_REFUNDED") return { ok: true as const, afterSale: result.afterSale, message: "退款已完成，库存未重复恢复" };
      if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "售后记录不存在" };
      if (result.status === "AMOUNT_MISMATCH") return { ok: false as const, code: result.status, message: "退款金额与订单实付不一致" };
      return { ok: false as const, code: result.status, message: "当前售后状态不允许退款" };
    },
    getByOrderNo(input: { userId?: string; orderNo: string }) {
      return repository.getByOrderNo(input);
    },
  };
}

export type AfterSaleService = ReturnType<typeof createAfterSaleService>;
