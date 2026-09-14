"use server";

import { revalidatePath } from "next/cache";

import { orderNoSchema } from "@/features/order/schema";
import type { MembershipLevel } from "@/lib/membership";
import { getActiveUserIdentity } from "@/server/auth/session";
import { paymentService } from "@/server/payments";

export type PaymentActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
  membershipLevel?: MembershipLevel;
};

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

    revalidatePath("/orders");
    revalidatePath(`/orders/${parsed.data}`);
    revalidatePath("/checkout");
    revalidatePath("/", "layout");
    return {
      status: "SUCCESS",
      message: result.message,
      membershipLevel: result.membershipLevel,
    };
  } catch (error) {
    console.error("模拟支付失败", { operation: "mockPay", error });
    return { status: "ERROR", message: "支付失败，请稍后重试" };
  }
}
