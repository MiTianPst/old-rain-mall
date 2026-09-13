"use client";

import { useActionState } from "react";

import {
  removeCartItemAction,
  type CartItemActionState,
  updateCartItemAction,
} from "@/app/actions/cart";

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
          <label className="sr-only" htmlFor={`quantity-${cartItemId}`}>
            商品数量
          </label>
          <input
            id={`quantity-${cartItemId}`}
            name="quantity"
            type="number"
            min={1}
            max={Math.min(99, Math.max(1, stock))}
            defaultValue={quantity}
            disabled={!canUpdate || updating || removing}
            className="w-20 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100 disabled:bg-stone-100"
          />
          <button
            type="submit"
            disabled={!canUpdate || updating || removing}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:border-amber-700 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {updating ? "更新中…" : "更新"}
          </button>
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
