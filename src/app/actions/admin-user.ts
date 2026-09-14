"use server";

import { revalidatePath } from "next/cache";

import { adminUserStatusSchema } from "@/features/admin/user-schema";
import { getAdminSession } from "@/server/admin/auth";
import { adminUserService } from "@/server/admin-users";
import { auditService } from "@/server/audit";

export type AdminUserActionState = { status: "IDLE" | "SUCCESS" | "ERROR"; message: string };

export async function setAdminUserStatusAction(_state: AdminUserActionState, formData: FormData): Promise<AdminUserActionState> {
  const admin = await getAdminSession();
  const parsed = adminUserStatusSchema.safeParse({ targetUserId: formData.get("targetUserId"), status: formData.get("status") });
  if (!parsed.success) return { status: "ERROR", message: "用户状态参数不正确" };
  const result = await adminUserService.setStatus(admin, parsed.data);
  if (!result.ok) return { status: "ERROR", message: result.message };
  await auditService.record(admin, { action: parsed.data.status === "FROZEN" ? "USER_FREEZE" : "USER_UNFREEZE", targetType: "USER", targetId: parsed.data.targetUserId, summary: parsed.data.status === "FROZEN" ? "冻结普通用户" : "解冻普通用户" }).catch(() => undefined);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.targetUserId}`);
  return { status: "SUCCESS", message: result.message };
}
