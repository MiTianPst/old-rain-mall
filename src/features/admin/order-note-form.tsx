"use client";

import { useActionState } from "react";

import { updateAdminOrderNoteAction, type AdminOrderActionState } from "@/app/actions/admin-order";

const initialState: AdminOrderActionState = { status: "IDLE", message: "" };

export function OrderNoteForm({ orderNo, note }: { orderNo: string; note: string | null }) {
  const [state, action, pending] = useActionState(updateAdminOrderNoteAction, initialState);
  return (
    <form action={action} className="mt-6 border-t border-stone-200 pt-5">
      <label htmlFor="admin-note" className="text-sm font-medium">管理员备注</label>
      <textarea id="admin-note" name="note" defaultValue={note ?? ""} maxLength={1000} rows={4} disabled={pending} placeholder="仅后台可见的订单备注" className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" />
      <input type="hidden" name="orderNo" value={orderNo} />
      <button disabled={pending} className="mt-3 rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "保存中…" : "保存备注"}</button>
      <p aria-live="polite" className={`mt-2 text-sm ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
    </form>
  );
}
