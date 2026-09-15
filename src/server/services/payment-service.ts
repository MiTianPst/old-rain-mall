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
    userId?: string;
    orderNo: string;
    providerResult: PaymentResult;
    now: Date;
  }): Promise<PaymentConfirmationResult>;
}

function errorResult(
  code: "UNAUTHORIZED" | "ACCOUNT_FROZEN" | "ORDER_NOT_FOUND" | "ORDER_EXPIRED" | "INVALID_STATE" | "AMOUNT_MISMATCH" | "PAYMENT_FAILED" | "PAYMENT_PENDING",
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

function mapConfirmationResult(result: PaymentConfirmationResult) {
  if (result.status === "PAID" || result.status === "ALREADY_PAID") {
    return {
      ok: true as const,
      alreadyPaid: result.status === "ALREADY_PAID",
      message: result.status === "ALREADY_PAID" ? "订单已支付" : "支付成功",
      membershipLevel: result.membershipLevel,
    };
  }
  return mapBusinessError(result.status);
}

export function createPaymentService(input: {
  repository: PaymentRepository;
  provider: PaymentProvider;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());

  const authorize = (userId: string | null, userStatus?: "ACTIVE" | "FROZEN") => {
    if (!userId) return errorResult("UNAUTHORIZED", "请先登录后再支付");
    if (userStatus === "FROZEN") return errorResult("ACCOUNT_FROZEN", "账号已被冻结，暂时无法执行此操作");
    return null;
  };

  const loadPayable = async (userId: string, orderNo: string) =>
    input.repository.getPayableOrder({ userId, orderNo, now: new Date(now().getTime()) });

  return {
    async initiate({ userId, orderNo, userStatus }: { userId: string | null; orderNo: string; userStatus?: "ACTIVE" | "FROZEN" }) {
      const denied = authorize(userId, userStatus);
      if (denied) return denied;
      const payable = await loadPayable(userId!, orderNo);
      if (payable.status === "ALREADY_PAID") {
        return { ok: true as const, alreadyPaid: true, message: "订单已支付", membershipLevel: payable.membershipLevel };
      }
      if (payable.status !== "PAYABLE") return mapBusinessError(payable.status);

      const creation = await input.provider.createPayment(payable.order);
      if (creation.status !== "SUCCESS") return errorResult("PAYMENT_FAILED", "支付未完成，请重新尝试");
      if (input.provider.method === "WECHAT_NATIVE" && !creation.codeUrl) {
        return errorResult("PAYMENT_FAILED", "微信支付二维码生成失败，请稍后重试");
      }
      return {
        ok: true as const,
        alreadyPaid: false,
        message: "支付订单已创建",
        paymentNo: payable.order.paymentNo,
        amountCents: payable.order.amountCents,
        codeUrl: creation.codeUrl,
      };
    },

    async confirmProviderPayment({ userId, orderNo, providerResult }: { userId?: string | null; orderNo: string; providerResult: PaymentResult }) {
      const confirmed = await input.repository.confirm({
        userId: userId ?? undefined,
        orderNo,
        providerResult,
        now: new Date(now().getTime()),
      });
      return mapConfirmationResult(confirmed);
    },

    async query({ userId, orderNo, userStatus }: { userId: string | null; orderNo: string; userStatus?: "ACTIVE" | "FROZEN" }) {
      const denied = authorize(userId, userStatus);
      if (denied) return denied;
      const payable = await loadPayable(userId!, orderNo);
      if (payable.status === "ALREADY_PAID") {
        return { ok: true as const, alreadyPaid: true, message: "订单已支付", membershipLevel: payable.membershipLevel };
      }
      if (payable.status !== "PAYABLE") return mapBusinessError(payable.status);
      if (!input.provider.queryPayment) return errorResult("PAYMENT_FAILED", "当前支付方式不支持主动查询");
      const providerResult = await input.provider.queryPayment(payable.order);
      if (providerResult.status !== "SUCCESS") return errorResult("PAYMENT_PENDING", "尚未收到支付结果，请稍后刷新");
      return mapConfirmationResult(await input.repository.confirm({
        userId: userId!,
        orderNo,
        providerResult,
        now: new Date(now().getTime()),
      }));
    },

    async pay({ userId, orderNo, userStatus }: { userId: string | null; orderNo: string; userStatus?: "ACTIVE" | "FROZEN" }) {
      const initiated = await this.initiate({ userId, orderNo, userStatus });
      if (!initiated.ok || initiated.alreadyPaid) return initiated;
      if (input.provider.method !== "MOCK") return errorResult("PAYMENT_PENDING", "请使用微信扫码完成支付");
      return mapConfirmationResult(await input.repository.confirm({
        userId: userId!,
        orderNo,
        providerResult: {
          status: "SUCCESS",
          paymentNo: initiated.paymentNo,
          amountCents: initiated.amountCents!,
          providerTradeNo: null,
        },
        now: new Date(now().getTime()),
      }));
    },
  };
}

export type PaymentService = ReturnType<typeof createPaymentService>;
