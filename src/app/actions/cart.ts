"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { safeNextPath } from "@/features/auth/schema";
import { getCurrentSession } from "@/server/auth/session";
import { cartService } from "@/server/cart";

const addToCartSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().max(99),
  returnTo: z.string().optional(),
});

export type AddToCartState = {
  status: "IDLE" | "SUCCESS" | "ERROR" | "UNAUTHORIZED";
  message: string;
  loginPath?: string;
};

export type CartItemActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
};

export async function addToCartAction(
  _previousState: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const parsed = addToCartSchema.safeParse({
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity"),
    returnTo: formData.get("returnTo"),
  });

  if (!parsed.success) {
    return { status: "ERROR", message: "加入购物车的参数不正确" };
  }

  const session = await getCurrentSession();
  const result = await cartService.addItem({
    userId: session?.user.id ?? null,
    variantId: parsed.data.variantId,
    quantity: parsed.data.quantity,
  });

  if (!result.ok) {
    if (result.code === "UNAUTHORIZED") {
      const returnTo = safeNextPath(parsed.data.returnTo);
      return {
        status: "UNAUTHORIZED",
        message: result.message,
        loginPath: `/login?next=${encodeURIComponent(returnTo)}`,
      };
    }
    return { status: "ERROR", message: result.message };
  }

  revalidatePath("/cart");
  return { status: "SUCCESS", message: result.message };
}

const updateCartItemSchema = z.object({
  cartItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(99),
});

const removeCartItemSchema = z.object({
  cartItemId: z.coerce.number().int().positive(),
});

export async function updateCartItemAction(
  _previousState: CartItemActionState,
  formData: FormData,
): Promise<CartItemActionState> {
  const parsed = updateCartItemSchema.safeParse({
    cartItemId: formData.get("cartItemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { status: "ERROR", message: "商品数量必须是 1 到 99 的整数" };
  }

  const session = await getCurrentSession();
  const result = await cartService.updateItem({
    userId: session?.user.id ?? null,
    cartItemId: parsed.data.cartItemId,
    quantity: parsed.data.quantity,
  });

  if (!result.ok) return { status: "ERROR", message: result.message };

  revalidatePath("/cart");
  return { status: "SUCCESS", message: result.message };
}

export async function removeCartItemAction(
  _previousState: CartItemActionState,
  formData: FormData,
): Promise<CartItemActionState> {
  const parsed = removeCartItemSchema.safeParse({
    cartItemId: formData.get("cartItemId"),
  });
  if (!parsed.success) {
    return { status: "ERROR", message: "购物车商品参数不正确" };
  }

  const session = await getCurrentSession();
  const result = await cartService.removeItem({
    userId: session?.user.id ?? null,
    cartItemId: parsed.data.cartItemId,
  });

  if (!result.ok) return { status: "ERROR", message: result.message };

  revalidatePath("/cart");
  return { status: "SUCCESS", message: result.message };
}
