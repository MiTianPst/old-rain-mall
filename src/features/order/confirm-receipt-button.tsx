"use client";

import { useActionState } from "react";

import { confirmReceiptAction, type ShipmentActionState } from "@/app/actions/shipment";

const initial: ShipmentActionState = { status: "IDLE", message: "" };

export function ConfirmReceiptButton({ orderNo }: { orderNo: string }) {
  const [state, action, pending] = useActionState(confirmReceiptAction, initial);
  return <form action={action} className="mt-4"><input type="hidden" name="orderNo" value={orderNo} /><button disabled={pending} className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{pending ? "提交中…" : "确认收货"}</button><p aria-live="polite" className={`mt-2 text-sm ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p></form>;
}

