"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  addToCartAction,
  type AddToCartState,
} from "@/app/actions/cart";

const initialAddToCartState: AddToCartState = {
  status: "IDLE",
  message: "",
};

type AddToCartButtonProps = {
  productId: number;
  returnTo: string;
  disabled: boolean;
};

export function AddToCartButton({
  productId,
  returnTo,
  disabled,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    addToCartAction,
    initialAddToCartState,
  );

  useEffect(() => {
    if (state.status === "UNAUTHORIZED" && state.loginPath) {
      router.push(state.loginPath);
    }
  }, [router, state]);

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="w-full rounded-full bg-stone-900 px-6 py-4 font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {disabled ? "暂时售罄" : pending ? "正在加入…" : "加入购物车"}
      </button>
      <p
        aria-live="polite"
        className={`mt-3 min-h-6 text-center text-sm ${
          state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {state.message}
      </p>
    </form>
  );
}
