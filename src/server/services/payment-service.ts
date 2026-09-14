import type { MembershipLevel } from "@/lib/membership";
import type {
  PaymentOrder,
  PaymentProvider,
  PaymentResult,
} from "@/server/payments/provider";

export type PayableOrderResult =
  | { status: "PAYABLE"; order: PaymentOrder }
  | { status: "ALREADY_PAID"; membershipLevel: MembershipLevel }
  | { status: "ORDER_NOT_FOUND" }
  | { status: "ORDER_EXPIRED" }
  | { status: "INVALID_STATE" };

export type PaymentConfirmationResult =
  | { status: "PAID" | "ALREADY_PAID"; membershipLevel: MembershipLevel }
  | { status: "ORDER_NOT_FOUND" | "ORDER_EXPIRED" | "INVALID_STATE" | "AMOUNT_MISMATCH" };

export interface PaymentRepository {
  getPayableOrder(input: {
    userId: string;
    orderNo: string;
    now: Date;
  }): Promise<PayableOrderResult>;
  confirm(input: {
    userId: string;
    orderNo: string;
    providerResult: PaymentResult;
    now: Date;
  }): Promise<PaymentConfirmationResult>;
}

function errorResult(
  code: "UNAUTHORIZED" | "ACCOUNT_FROZEN" | "ORDER_NOT_FOUND" | "ORDER_EXPIRED" | "INVALID_STATE" | "AMOUNT_MISMATCH" | "PAYMENT_FAILED",
  message: string,
) {
  return { ok: false as const, code, message };
}

function mapBusinessError(status: Exclude<PayableOrderResult["status"] | PaymentConfirmationResult["status"], "PAYABLE" | "PAID" | "ALREADY_PAID">) {
  if (status === "ORDER_NOT_FOUND") return errorResult(status, "订单不存在");
  if (status === "ORDER_EXPIRED") return errorResult(status, "订单已超时关闭");
  if (status === "AMOUNT_MISMATCH") return errorResult(status, "支付金额校验失败");
  return errorResult("INVALID_STATE", "当前订单状态不可支付");
}

export function createPaymentService(input: {
  repository: PaymentRepository;
  provider: PaymentProvider;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());

  return {
    async pay({ userId, orderNo, userStatus }: { userId: string | null; orderNo: string; userStatus?: "ACTIVE" | "FROZEN" }) {
      if (!userId) return errorResult("UNAUTHORIZED", "请先登录后再支付");
      if (userStatus === "FROZEN") return errorResult("ACCOUNT_FROZEN", "账号已被冻结，暂时无法执行此操作");
      const currentTime = new Date(now().getTime());
      const payable = await input.repository.getPayableOrder({ userId, orderNo, now: currentTime });
      if (payable.status === "ALREADY_PAID") {
        return { ok: true as const, alreadyPaid: true, message: "订单已支付", membershipLevel: payable.membershipLevel };
      }
      if (payable.status !== "PAYABLE") return mapBusinessError(payable.status);

      const providerResult = await input.provider.createPayment(payable.order);
      if (providerResult.status !== "SUCCESS") {
        return errorResult("PAYMENT_FAILED", "支付未完成，请重新尝试");
      }
      const confirmed = await input.repository.confirm({
        userId,
        orderNo,
        providerResult,
        now: new Date(now().getTime()),
      });
      if (confirmed.status === "PAID" || confirmed.status === "ALREADY_PAID") {
        return {
          ok: true as const,
          alreadyPaid: confirmed.status === "ALREADY_PAID",
          message: confirmed.status === "ALREADY_PAID" ? "订单已支付" : "支付成功",
          membershipLevel: confirmed.membershipLevel,
        };
      }
      return mapBusinessError(confirmed.status);
    },
  };
}

export type PaymentService = ReturnType<typeof createPaymentService>;
