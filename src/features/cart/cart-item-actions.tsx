"use client";

import { useActionState } from "react";

import {
  removeCartItemAction,
  type CartItemActionState,
  updateCartItemAction,
} from "@/app/actions/cart";
import { getCartQuantityControls } from "./cart-quantity";

const initialState: CartItemActionState = {
  status: "IDLE",
  message: "",
};

type CartItemActionsProps = {
  cartItemId: number;
  quantity: number;
  stock: number;
  canUpdate: boolean;
};

export function CartItemActions({
  cartItemId,
  quantity,
  stock,
  canUpdate,
}: CartItemActionsProps) {
  const controls = getCartQuantityControls({ quantity, stock });
  const [updateState, updateAction, updating] = useActionState(
    updateCartItemAction,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeCartItemAction,
    initialState,
  );
  const message = removeState.message || updateState.message;
  const successful =
    removeState.status === "SUCCESS" || updateState.status === "SUCCESS";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <form action={updateAction} className="flex items-center gap-2">
          <input type="hidden" name="cartItemId" value={cartItemId} />
          <div className="flex items-center overflow-hidden rounded-xl border border-stone-300 bg-white">
            <button
              type="submit"
              name="quantity"
              value={controls.previous ?? quantity}
              aria-label="减少商品数量"
              disabled={!canUpdate || controls.previous === null || updating || removing}
              className="flex size-10 items-center justify-center text-lg text-stone-600 transition hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:text-stone-300"
            >
              −
            </button>
            <output aria-live="polite" className="flex min-w-10 justify-center border-x border-stone-200 px-2 text-sm font-medium text-stone-900">
              {quantity}
            </output>
            <button
              type="submit"
              name="quantity"
              value={controls.next ?? quantity}
              aria-label="增加商品数量"
              disabled={!canUpdate || controls.next === null || updating || removing}
              className="flex size-10 items-center justify-center text-lg text-stone-600 transition hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:text-stone-300"
            >
              +
            </button>
          </div>
        </form>

        <form action={removeAction}>
          <input type="hidden" name="cartItemId" value={cartItemId} />
          <button
            type="submit"
            disabled={updating || removing}
            className="rounded-full px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-40"
          >
            {removing ? "删除中…" : "删除"}
          </button>
        </form>
      </div>
      <p
        aria-live="polite"
        className={`mt-2 min-h-5 text-xs ${
          successful ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
