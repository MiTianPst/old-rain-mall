"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { safeNextPath } from "@/features/auth/schema";
import { getActiveUserIdentity } from "@/server/auth/session";
import { engagementService } from "@/server/engagement";

const favoriteSchema = z.object({
  productId: z.coerce.number().int().positive(),
  returnTo: z.string().optional(),
});

export type FavoriteActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR" | "UNAUTHORIZED";
  message: string;
  favorited: boolean;
  loginPath?: string;
};

export async function toggleFavoriteAction(
  previousState: FavoriteActionState,
  formData: FormData,
): Promise<FavoriteActionState> {
  const parsed = favoriteSchema.safeParse({
    productId: formData.get("productId"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) {
    return { ...previousState, status: "ERROR", message: "收藏商品参数不正确" };
  }

  const identity = await getActiveUserIdentity();
  const result = await engagementService.toggleFavorite({
    userId: identity?.session.user.id ?? null,
    userStatus: identity?.user.status,
    productId: parsed.data.productId,
  });

  if (!result.ok) {
    if (result.code === "UNAUTHORIZED") {
      const returnTo = safeNextPath(parsed.data.returnTo);
      return {
        ...previousState,
        status: "UNAUTHORIZED",
        message: result.message,
        loginPath: `/login?next=${encodeURIComponent(returnTo)}`,
      };
    }
    return { ...previousState, status: "ERROR", message: result.message };
  }

  revalidatePath("/");
  revalidatePath("/account/favorites");
  const returnTo = safeNextPath(parsed.data.returnTo);
  if (returnTo.startsWith("/products/")) revalidatePath(returnTo);
  return { status: "SUCCESS", message: result.message, favorited: result.favorited };
}
