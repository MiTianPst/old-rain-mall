"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActiveUserIdentity, getCurrentSession } from "@/server/auth/session";
import { historyService } from "@/server/history";

const productIdSchema = z.coerce.number().int().positive();

export async function recordProductViewAction(productId: number) {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return;
  const identity = await getActiveUserIdentity();
  if (!identity) return;

  const result = await historyService.recordView({
    userId: identity.session.user.id,
    userStatus: identity.user.status,
    productId: parsed.data,
  });
  if (result.ok) revalidatePath("/account/history");
}

export type ClearHistoryActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
};

export async function clearHistoryAction(
  _previousState: ClearHistoryActionState,
  formData: FormData,
): Promise<ClearHistoryActionState> {
  void _previousState;
  if (formData.get("confirm") !== "true") {
    return { status: "ERROR", message: "请确认清空浏览记录" };
  }
  const session = await getCurrentSession();
  if (!session) return { status: "ERROR", message: "请先登录后管理浏览记录" };

  await historyService.clearViews(session.user.id);
  revalidatePath("/account/history");
  return { status: "SUCCESS", message: "浏览记录已清空" };
}
