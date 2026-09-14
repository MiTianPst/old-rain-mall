"use client";

import { useActionState } from "react";

import {
  advanceShipmentAction,
  createShipmentAction,
  markDeliveredOrderCompletedAction,
  type AdminOrderActionState,
} from "@/app/actions/admin-order";

const initialState: AdminOrderActionState = { status: "IDLE", message: "" };

export function CreateShipmentForm({ orderNo }: { orderNo: string }) {
  const [state, action, pending] = useActionState(createShipmentAction, initialState);
  return <form action={action} className="mt-5 space-y-3 border-t border-stone-200 pt-5"><h3 className="font-medium">录入物流</h3><input type="hidden" name="orderNo" value={orderNo} /><div className="grid gap-3 sm:grid-cols-2"><input name="carrier" required minLength={2} maxLength={100} placeholder="物流公司，如顺丰速运" disabled={pending} className="rounded-xl border border-stone-300 px-3 py-2 text-sm" /><input name="trackingNo" required minLength={4} maxLength={100} placeholder="物流单号" disabled={pending} className="rounded-xl border border-stone-300 px-3 py-2 text-sm" /></div><button disabled={pending} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "提交中…" : "确认发货"}</button><p aria-live="polite" className={`text-sm ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p></form>;
}

export function AdvanceShipmentButton({ orderNo, targetStatus }: { orderNo: string; targetStatus: "IN_TRANSIT" | "DELIVERED" }) {
  const [state, action, pending] = useActionState(advanceShipmentAction, initialState);
  return <form action={action} className="mt-5"><input type="hidden" name="orderNo" value={orderNo} /><input type="hidden" name="targetStatus" value={targetStatus} /><button disabled={pending} className="w-full rounded-full bg-amber-300 px-4 py-2.5 text-sm font-medium text-stone-900 disabled:opacity-50">{pending ? "处理中…" : targetStatus === "IN_TRANSIT" ? "模拟运输中" : "模拟已送达"}</button><p aria-live="polite" className="mt-2 text-sm text-rose-700">{state.message}</p></form>;
}

export function CompleteDeliveredOrderButton({ orderNo }: { orderNo: string }) {
  const [state, action, pending] = useActionState(markDeliveredOrderCompletedAction, initialState);
  return <form action={action} className="mt-5"><input type="hidden" name="orderNo" value={orderNo} /><button disabled={pending} className="w-full rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{pending ? "处理中…" : "完成订单"}</button><p aria-live="polite" className="mt-2 text-sm text-rose-700">{state.message}</p></form>;
}

export function AdminOrderStatusActions({ orderNo, status }: { orderNo: string; status: "PAID" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED" }) {
  if (status === "PAID") return <CreateShipmentForm orderNo={orderNo} />;
  if (status === "SHIPPED") return <AdvanceShipmentButton orderNo={orderNo} targetStatus="IN_TRANSIT" />;
  if (status === "IN_TRANSIT") return <AdvanceShipmentButton orderNo={orderNo} targetStatus="DELIVERED" />;
  return <CompleteDeliveredOrderButton orderNo={orderNo} />;
}
