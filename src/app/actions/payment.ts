"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";

import { orderNoSchema } from "@/features/order/schema";
import type { MembershipLevel } from "@/lib/membership";
import { getActiveUserIdentity } from "@/server/auth/session";
import { paymentService } from "@/server/payments";

export type PaymentActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
  membershipLevel?: MembershipLevel;
  qrCodeDataUrl?: string;
};

function refreshPaymentPaths(orderNo: string) {
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderNo}`);
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}

export async function mockPayAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const identity = await getActiveUserIdentity();
  if (!identity) return { status: "ERROR", message: "请先登录后再支付" };

  const parsed = orderNoSchema.safeParse(formData.get("orderNo"));
  if (!parsed.success) return { status: "ERROR", message: "订单号格式不正确" };

  try {
    const result = await paymentService.pay({
      userId: identity.session.user.id,
      orderNo: parsed.data,
      userStatus: identity.user.status,
    });
    if (!result.ok) return { status: "ERROR", message: result.message };

    refreshPaymentPaths(parsed.data);
    return {
      status: "SUCCESS",
      message: result.message,
      ...(result.membershipLevel !== undefined ? { membershipLevel: result.membershipLevel } : {}),
    };
  } catch (error) {
    console.error("模拟支付失败", { operation: "mockPay", error });
    return { status: "ERROR", message: "支付失败，请稍后重试" };
  }
}

export async function wechatPayAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const identity = await getActiveUserIdentity();
  if (!identity) return { status: "ERROR", message: "请先登录后再支付" };

  const parsed = orderNoSchema.safeParse(formData.get("orderNo"));
  if (!parsed.success) return { status: "ERROR", message: "订单号格式不正确" };

  try {
    const result = await paymentService.initiate({
      userId: identity.session.user.id,
      orderNo: parsed.data,
      userStatus: identity.user.status,
    });
    if (!result.ok) return { status: "ERROR", message: result.message };
    if (result.alreadyPaid) {
      refreshPaymentPaths(parsed.data);
      return { status: "SUCCESS", message: result.message, membershipLevel: result.membershipLevel! };
    }
    if (!result.codeUrl) return { status: "ERROR", message: "微信支付二维码生成失败，请稍后重试" };
    const qrCodeDataUrl = await QRCode.toDataURL(result.codeUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
    });
    return { status: "SUCCESS", message: "请使用微信扫描二维码完成支付", qrCodeDataUrl };
  } catch (error) {
    console.error("微信支付下单失败", { operation: "wechatPay", errorName: error instanceof Error ? error.name : "UnknownError" });
    return { status: "ERROR", message: "微信支付暂不可用，请稍后重试" };
  }
}

export async function queryWechatPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const identity = await getActiveUserIdentity();
  if (!identity) return { status: "ERROR", message: "请先登录后再查询支付状态" };

  const parsed = orderNoSchema.safeParse(formData.get("orderNo"));
  if (!parsed.success) return { status: "ERROR", message: "订单号格式不正确" };

  try {
    const result = await paymentService.query({
      userId: identity.session.user.id,
      orderNo: parsed.data,
      userStatus: identity.user.status,
    });
    if (!result.ok) return { status: "ERROR", message: result.message };
    refreshPaymentPaths(parsed.data);
    return { status: "SUCCESS", message: result.message, membershipLevel: result.membershipLevel };
  } catch (error) {
    console.error("查询微信支付状态失败", { operation: "wechatQuery", errorName: error instanceof Error ? error.name : "UnknownError" });
    return { status: "ERROR", message: "支付状态查询失败，请稍后重试" };
  }
}
