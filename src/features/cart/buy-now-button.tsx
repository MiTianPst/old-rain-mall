"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { addToCartAction, type AddToCartState } from "@/app/actions/cart";

const initialState: AddToCartState = { status: "IDLE", message: "" };

export function BuyNowButton({ variantId, returnTo, disabled }: { variantId: number; returnTo: string; disabled: boolean }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addToCartAction, initialState);

  useEffect(() => {
    if (state.status === "SUCCESS") router.push("/checkout");
    if (state.status === "UNAUTHORIZED" && state.loginPath) router.push(state.loginPath);
  }, [router, state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="w-full rounded-full border border-amber-700 bg-amber-50 px-5 py-3 font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
      >
        {disabled ? "暂时售罄" : pending ? "正在准备结算…" : "立即购买"}
      </button>
      <p aria-live="polite" className="mt-2 min-h-5 text-center text-xs text-rose-700">
        {state.status === "ERROR" ? state.message : ""}
      </p>
    </form>
  );
}
