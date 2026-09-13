"use client";

import { useActionState } from "react";

import { adjustInventoryAction, type AdminProductActionState } from "@/app/actions/admin-product";

const initialState: AdminProductActionState = { status: "IDLE", message: "" };

export function InventoryAdjustmentForm({ variantId }: { variantId: number }) {
  const [state, action, pending] = useActionState(adjustInventoryAction, initialState);
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
      <input type="hidden" name="variantId" value={variantId} />
      <input name="quantityDelta" type="number" step={1} placeholder="如 10 或 -2" required disabled={pending} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      <input name="note" maxLength={500} placeholder="调整原因（必填）" required disabled={pending} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      <button disabled={pending} className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "提交中…" : "调整库存"}</button>
      <p aria-live="polite" className={`text-xs sm:col-span-3 ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
    </form>
  );
}
