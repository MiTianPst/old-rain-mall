"use client";

import { useActionState } from "react";

import { cancelOrderAction, type OrderActionState } from "@/app/actions/order";

const initialState: OrderActionState = { status: "IDLE", message: "" };

export function CancelOrderButton({ orderNo }: { orderNo: string }) {
  const [state, action, pending] = useActionState(cancelOrderAction, initialState);
  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="orderNo" value={orderNo} />
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm("确认取消这个订单吗？取消后库存将恢复。")) event.preventDefault();
        }}
        className="rounded-full border border-rose-300 px-5 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
      >
        {pending ? "正在取消…" : "取消订单"}
      </button>
      <p aria-live="polite" className={`mt-3 text-sm ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
    </form>
  );
}
