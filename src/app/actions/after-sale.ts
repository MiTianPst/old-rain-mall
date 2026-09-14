"use server";

import { revalidatePath } from "next/cache";

import { afterSaleRefundSchema, afterSaleRequestSchema, afterSaleReviewSchema } from "@/features/after-sale/schema";
import { getActiveUserIdentity } from "@/server/auth/session";
import { getAdminSession } from "@/server/admin/auth";
import { afterSaleService } from "@/server/after-sales";
import { auditService } from "@/server/audit";

export type AfterSaleActionState = { status: "IDLE" | "SUCCESS" | "ERROR"; message: string; fieldErrors?: Record<string, string[]> };
const fail = (message: string, fieldErrors?: Record<string, string[]>): AfterSaleActionState => ({ status: "ERROR", message, fieldErrors });

export async function requestAfterSaleAction(_state: AfterSaleActionState, formData: FormData): Promise<AfterSaleActionState> {
  const identity = await getActiveUserIdentity();
  const parsed = afterSaleRequestSchema.safeParse({ orderNo: formData.get("orderNo"), reason: formData.get("reason"), description: formData.get("description") });
  if (!parsed.success) return fail("请检查售后信息", parsed.error.flatten().fieldErrors);
  const result = await afterSaleService.request({ userId: identity?.session.user.id ?? null, userStatus: identity?.user.status, ...parsed.data });
  if (!result.ok) return fail(result.message);
  revalidatePath("/orders");
  revalidatePath(`/orders/${parsed.data.orderNo}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderNo}`);
  return { status: "SUCCESS", message: result.message };
}

export async function reviewAfterSaleAction(_state: AfterSaleActionState, formData: FormData): Promise<AfterSaleActionState> {
  const admin = await getAdminSession();
  const parsed = afterSaleReviewSchema.safeParse({ afterSaleId: formData.get("afterSaleId"), decision: formData.get("decision"), reviewNote: formData.get("reviewNote") });
  if (!parsed.success) return fail("请检查审核信息", parsed.error.flatten().fieldErrors);
  const result = await afterSaleService.review(admin, parsed.data);
  if (!result.ok) return fail(result.message);
  await auditService.record(admin, { action: "AFTER_SALE_REVIEW", targetType: "AFTER_SALE", targetId: String(result.afterSale.id), summary: parsed.data.decision === "APPROVE" ? "审核通过售后申请" : "拒绝售后申请" }).catch(() => undefined);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${result.afterSale.orderNo}`);
  revalidatePath("/orders");
  revalidatePath(`/orders/${result.afterSale.orderNo}`);
  return { status: "SUCCESS", message: result.message };
}

export async function refundAfterSaleAction(_state: AfterSaleActionState, formData: FormData): Promise<AfterSaleActionState> {
  const admin = await getAdminSession();
  const parsed = afterSaleRefundSchema.safeParse({ afterSaleId: formData.get("afterSaleId") });
  if (!parsed.success) return fail("售后编号不正确");
  const result = await afterSaleService.refund(admin, parsed.data);
  if (!result.ok) return fail(result.message);
  await auditService.record(admin, { action: "AFTER_SALE_REFUND", targetType: "AFTER_SALE", targetId: String(result.afterSale.id), summary: "执行本地模拟退款" }).catch(() => undefined);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${result.afterSale.orderNo}`);
  revalidatePath("/orders");
  revalidatePath(`/orders/${result.afterSale.orderNo}`);
  return { status: "SUCCESS", message: result.message };
}
