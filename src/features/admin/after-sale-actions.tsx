"use client";

import { useActionState } from "react";

import { refundAfterSaleAction, reviewAfterSaleAction, type AfterSaleActionState } from "@/app/actions/after-sale";

const initial: AfterSaleActionState = { status: "IDLE", message: "" };

export function AfterSaleReviewActions({ afterSaleId }: { afterSaleId: number }) {
  const [state, action, pending] = useActionState(reviewAfterSaleAction, initial);
  return <form action={action} className="mt-4 space-y-3"><input type="hidden" name="afterSaleId" value={afterSaleId} /><textarea name="reviewNote" required minLength={2} maxLength={1000} rows={2} placeholder="审核说明" disabled={pending} className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /><div className="flex gap-2"><button name="decision" value="APPROVE" disabled={pending} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">通过</button><button name="decision" value="REJECT" disabled={pending} className="rounded-full border border-rose-300 px-4 py-2 text-sm text-rose-700 disabled:opacity-50">拒绝</button></div><p className="text-sm text-rose-700">{state.message}</p></form>;
}

export function RefundAfterSaleButton({ afterSaleId }: { afterSaleId: number }) {
  const [state, action, pending] = useActionState(refundAfterSaleAction, initial);
  return <form action={action} className="mt-4"><input type="hidden" name="afterSaleId" value={afterSaleId} /><button disabled={pending} className="rounded-full bg-amber-300 px-4 py-2 text-sm text-stone-900 disabled:opacity-50">{pending ? "退款处理中…" : "模拟退款"}</button><p className="mt-2 text-sm text-rose-700">{state.message}</p></form>;
}

