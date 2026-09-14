"use server";
import { revalidatePath } from "next/cache";
import { adminOrderNoSchema } from "@/features/admin/order-schema";
import { getAdminSession } from "@/server/admin/auth";
import { adminOrderService } from "@/server/admin-orders";
import { shipmentService } from "@/server/shipments";
import { auditService } from "@/server/audit";
import { adminOrderNoteSchema } from "@/features/admin/order-schema";
export type AdminOrderActionState = { status: "IDLE" | "SUCCESS" | "ERROR"; message: string };
const fail = (message: string): AdminOrderActionState => ({ status: "ERROR", message });
function refresh(orderNo: string) { revalidatePath("/admin/orders"); revalidatePath(`/admin/orders/${orderNo}`); revalidatePath("/orders"); revalidatePath(`/orders/${orderNo}`); }
async function run(command: "SHIP" | "COMPLETE", formData: FormData): Promise<AdminOrderActionState> { const admin = await getAdminSession(); if (!admin) return fail("没有后台管理权限"); const parsed = adminOrderNoSchema.safeParse(formData.get("orderNo")); if (!parsed.success) return fail("订单号格式不正确"); try { const result = command === "SHIP" ? await adminOrderService.markShipped(admin, parsed.data) : await adminOrderService.markCompleted(admin, parsed.data); if (!result.ok) return fail(result.message); refresh(parsed.data); return { status: "SUCCESS", message: result.message }; } catch (error) { console.error("后台订单操作失败", { command, error }); return fail("订单操作失败，请稍后重试"); } }
export async function markOrderShippedAction(_state: AdminOrderActionState, formData: FormData) { return run("SHIP", formData); }
export async function markOrderCompletedAction(_state: AdminOrderActionState, formData: FormData) { return run("COMPLETE", formData); }

export async function createShipmentAction(_state: AdminOrderActionState, formData: FormData): Promise<AdminOrderActionState> {
  const admin = await getAdminSession();
  if (!admin) return fail("没有后台管理权限");
  const result = await shipmentService.ship(admin, {
    orderNo: String(formData.get("orderNo") ?? ""),
    carrier: String(formData.get("carrier") ?? ""),
    trackingNo: String(formData.get("trackingNo") ?? ""),
  });
  if (!result.ok) return fail(result.message);
  const orderNo = String(formData.get("orderNo") ?? "");
  refresh(orderNo);
  await auditService.record(admin, { action: "SHIPMENT_CREATE", targetType: "SHIPMENT", targetId: orderNo, summary: "录入订单物流" }).catch(() => undefined);
  return { status: "SUCCESS", message: result.message };
}

export async function advanceShipmentAction(_state: AdminOrderActionState, formData: FormData): Promise<AdminOrderActionState> {
  const admin = await getAdminSession();
  if (!admin) return fail("没有后台管理权限");
  const targetStatus = formData.get("targetStatus") === "DELIVERED" ? "DELIVERED" : "IN_TRANSIT";
  const result = await shipmentService.advance(admin, {
    orderNo: String(formData.get("orderNo") ?? ""),
    targetStatus,
  });
  if (!result.ok) return fail(result.message);
  const orderNo = String(formData.get("orderNo") ?? "");
  refresh(orderNo);
  await auditService.record(admin, { action: "SHIPMENT_ADVANCE", targetType: "SHIPMENT", targetId: orderNo, summary: `更新物流状态：${targetStatus}` }).catch(() => undefined);
  return { status: "SUCCESS", message: result.message };
}

export async function markDeliveredOrderCompletedAction(_state: AdminOrderActionState, formData: FormData): Promise<AdminOrderActionState> {
  const admin = await getAdminSession();
  if (!admin) return fail("没有后台管理权限");
  const orderNo = String(formData.get("orderNo") ?? "");
  const result = await shipmentService.complete(admin, orderNo);
  if (!result.ok) return fail(result.message);
  refresh(orderNo);
  await auditService.record(admin, { action: "ORDER_COMPLETE", targetType: "ORDER", targetId: orderNo, summary: "完成已送达订单" }).catch(() => undefined);
  return { status: "SUCCESS", message: result.message };
}

export async function updateAdminOrderNoteAction(_state: AdminOrderActionState, formData: FormData): Promise<AdminOrderActionState> {
  const admin = await getAdminSession();
  if (!admin) return fail("没有后台管理权限");
  const parsed = adminOrderNoteSchema.safeParse({ orderNo: formData.get("orderNo"), note: formData.get("note") });
  if (!parsed.success) return fail("备注不能超过 1000 个字符");
  const result = await adminOrderService.updateNote(admin, { orderNo: parsed.data.orderNo, note: parsed.data.note || null });
  if (!result.ok) return fail(result.message);
  await auditService.record(admin, { action: "ORDER_NOTE_UPDATE", targetType: "ORDER", targetId: parsed.data.orderNo, summary: "更新订单管理员备注" }).catch(() => undefined);
  refresh(parsed.data.orderNo);
  return { status: "SUCCESS", message: result.message };
}
