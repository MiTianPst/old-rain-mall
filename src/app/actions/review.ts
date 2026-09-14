"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { safeNextPath } from "@/features/auth/schema";
import { getActiveUserIdentity } from "@/server/auth/session";
import { getAdminSession } from "@/server/admin/auth";
import { reviewService } from "@/server/review";

const createReviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  orderItemId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, "请选择 1 到 5 星").max(5, "请选择 1 到 5 星"),
  content: z.string().trim().min(2, "评价内容至少需要 2 个字").max(1000, "评价内容不能超过 1000 个字"),
  orderNo: z.string().trim().min(1),
  returnTo: z.string().optional(),
});

export type ReviewActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR" | "UNAUTHORIZED";
  message: string;
  loginPath?: string;
};

export async function createReviewAction(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = createReviewSchema.safeParse({
    productId: formData.get("productId"),
    orderItemId: formData.get("orderItemId"),
    rating: formData.get("rating"),
    content: formData.get("content"),
    orderNo: formData.get("orderNo"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) return { status: "ERROR", message: parsed.error.issues[0]?.message ?? "评价内容不正确" };

  const identity = await getActiveUserIdentity();
  const result = await reviewService.createReview({
    userId: identity?.session.user.id ?? null,
    userStatus: identity?.user.status,
    productId: parsed.data.productId,
    orderItemId: parsed.data.orderItemId,
    rating: parsed.data.rating,
    content: parsed.data.content,
  });
  if (!result.ok) {
    if (result.code === "UNAUTHORIZED") {
      const returnTo = safeNextPath(parsed.data.returnTo || `/orders/${parsed.data.orderNo}`);
      return { status: "UNAUTHORIZED", message: result.message, loginPath: `/login?next=${encodeURIComponent(returnTo)}` };
    }
    return { status: "ERROR", message: result.message };
  }

  revalidatePath(`/orders/${parsed.data.orderNo}`);
  revalidatePath(`/products/[slug]`, "page");
  return { status: "SUCCESS", message: result.message };
}

const moderateReviewSchema = z.object({
  reviewId: z.coerce.number().int().positive(),
  status: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500, "审核备注不能超过 500 个字").optional(),
});

export type ModerateReviewActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
};

export async function moderateReviewAction(
  _previousState: ModerateReviewActionState,
  formData: FormData,
): Promise<ModerateReviewActionState> {
  const parsed = moderateReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { status: "ERROR", message: "审核参数不正确" };

  const admin = await getAdminSession();
  const result = await reviewService.moderate({
    adminId: admin?.id ?? null,
    reviewId: parsed.data.reviewId,
    status: parsed.data.status,
    note: parsed.data.note,
  });
  if (!result.ok) return { status: "ERROR", message: result.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/products/[slug]", "page");
  return { status: "SUCCESS", message: result.message };
}
