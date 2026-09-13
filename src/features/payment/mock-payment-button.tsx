"use client";

import { useActionState } from "react";

import { mockPayAction, type PaymentActionState } from "@/app/actions/payment";
import { getMembershipLabel } from "@/lib/membership";

const initialState: PaymentActionState = { status: "IDLE", message: "" };

export function MockPaymentButton({ orderNo }: { orderNo: string }) {
  const [state, action, pending] = useActionState(mockPayAction, initialState);

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="orderNo" value={orderNo} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-amber-300 px-5 py-3 font-medium text-stone-900 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "支付处理中…" : "模拟支付"}
      </button>
      <p
        aria-live="polite"
        className={`mt-3 text-sm ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}
      >
        {state.message}
        {state.status === "SUCCESS" && state.membershipLevel !== undefined
          ? `，当前等级：${getMembershipLabel(state.membershipLevel)}`
          : ""}
      </p>
    </form>
  );
}
