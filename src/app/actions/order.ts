"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cancelOrderSchema, createOrderSchema } from "@/features/order/schema";
import { getCurrentSession } from "@/server/auth/session";
import { orderService } from "@/server/orders";

export type OrderActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
  orderNo?: string;
};

function errorState(message: string): OrderActionState {
  return { status: "ERROR", message };
}

function logOrderActionError(operation: string, error: unknown) {
  console.error("订单操作失败", { operation, error });
}

export async function createOrderAction(
  _previousState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const session = await getCurrentSession();
  if (!session) return errorState("请先登录后再创建订单");

  const parsed = createOrderSchema.safeParse({ addressId: formData.get("addressId") });
  if (!parsed.success) return errorState("请选择有效的收货地址");

  let orderNo: string;
  try {
    const result = await orderService.createOrder({
      userId: session.user.id,
      addressId: parsed.data.addressId,
    });
    if (!result.ok) return errorState(result.message);
    orderNo = result.orderNo;
  } catch (error) {
    logOrderActionError("创建订单", error);
    return errorState("创建订单失败，请稍后重试");
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/orders");
  redirect(`/orders/${orderNo}`);
}

export async function cancelOrderAction(
  _previousState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const session = await getCurrentSession();
  if (!session) return errorState("请先登录后再取消订单");

  const parsed = cancelOrderSchema.safeParse({ orderNo: formData.get("orderNo") });
  if (!parsed.success) return errorState("订单号格式不正确");

  try {
    const result = await orderService.cancelOrder({
      userId: session.user.id,
      orderNo: parsed.data.orderNo,
    });
    if (!result.ok) return errorState(result.message);
  } catch (error) {
    logOrderActionError("取消订单", error);
    return errorState("取消订单失败，请稍后重试");
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${parsed.data.orderNo}`);
  return { status: "SUCCESS", message: "订单已取消" };
}
