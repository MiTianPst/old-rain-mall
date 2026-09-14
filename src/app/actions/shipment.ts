"use server";

import { revalidatePath } from "next/cache";

import { orderNoSchema } from "@/features/shipping/schema";
import { getCurrentSession } from "@/server/auth/session";
import { shipmentService } from "@/server/shipments";

export type ShipmentActionState = { status: "IDLE" | "SUCCESS" | "ERROR"; message: string };

export async function confirmReceiptAction(_state: ShipmentActionState, formData: FormData): Promise<ShipmentActionState> {
  const session = await getCurrentSession();
  if (!session) return { status: "ERROR", message: "请先登录后确认收货" };
  const orderNo = orderNoSchema.safeParse(formData.get("orderNo"));
  if (!orderNo.success) return { status: "ERROR", message: "订单号格式不正确" };
  const result = await shipmentService.confirmReceipt({ userId: session.user.id, orderNo: orderNo.data });
  if (!result.ok) return { status: "ERROR", message: result.message };
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderNo.data}`);
  return { status: "SUCCESS", message: result.message };
}

