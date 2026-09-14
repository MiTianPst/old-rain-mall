"use client";

import { useActionState } from "react";

import { requestAfterSaleAction, type AfterSaleActionState } from "@/app/actions/after-sale";

const initial: AfterSaleActionState = { status: "IDLE", message: "" };

export function AfterSaleForm({ orderNo }: { orderNo: string }) {
  const [state, action, pending] = useActionState(requestAfterSaleAction, initial);
  return <form action={action} className="mt-4 space-y-3"><input type="hidden" name="orderNo" value={orderNo} /><select name="reason" required disabled={pending} className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"><option value="">请选择售后原因</option><option value="商品破损">商品破损</option><option value="商品与描述不符">商品与描述不符</option><option value="不需要了">不需要了</option><option value="其他">其他</option></select><textarea name="description" required minLength={5} maxLength={1000} rows={3} placeholder="请说明售后原因（至少 5 个字）" disabled={pending} className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /><button disabled={pending} className="rounded-full border border-amber-700 px-4 py-2 text-sm text-amber-800 disabled:opacity-50">{pending ? "提交中…" : "申请售后"}</button><p aria-live="polite" className={`text-sm ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p></form>;
}

