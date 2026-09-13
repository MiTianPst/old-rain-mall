"use server";
import { revalidatePath } from "next/cache";
import { adminOrderNoSchema } from "@/features/admin/order-schema";
import { getAdminSession } from "@/server/admin/auth";
import { adminOrderService } from "@/server/admin-orders";
export type AdminOrderActionState = { status: "IDLE" | "SUCCESS" | "ERROR"; message: string };
const fail = (message: string): AdminOrderActionState => ({ status: "ERROR", message });
function refresh(orderNo: string) { revalidatePath("/admin/orders"); revalidatePath(`/admin/orders/${orderNo}`); revalidatePath("/orders"); revalidatePath(`/orders/${orderNo}`); }
async function run(command: "SHIP" | "COMPLETE", formData: FormData): Promise<AdminOrderActionState> { const admin = await getAdminSession(); if (!admin) return fail("没有后台管理权限"); const parsed = adminOrderNoSchema.safeParse(formData.get("orderNo")); if (!parsed.success) return fail("订单号格式不正确"); try { const result = command === "SHIP" ? await adminOrderService.markShipped(admin, parsed.data) : await adminOrderService.markCompleted(admin, parsed.data); if (!result.ok) return fail(result.message); refresh(parsed.data); return { status: "SUCCESS", message: result.message }; } catch (error) { console.error("后台订单操作失败", { command, error }); return fail("订单操作失败，请稍后重试"); } }
export async function markOrderShippedAction(_state: AdminOrderActionState, formData: FormData) { return run("SHIP", formData); }
export async function markOrderCompletedAction(_state: AdminOrderActionState, formData: FormData) { return run("COMPLETE", formData); }
