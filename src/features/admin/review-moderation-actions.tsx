"use client";

import { useActionState } from "react";

import { moderateReviewAction, type ModerateReviewActionState } from "@/app/actions/review";

const initialState: ModerateReviewActionState = { status: "IDLE", message: "" };

export function ReviewModerationActions({ reviewId, status }: { reviewId: number; status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const [state, formAction, pending] = useActionState(moderateReviewAction, initialState);
  if (status !== "PENDING") return <p className="text-xs text-stone-500">{status === "APPROVED" ? "已通过" : "已驳回"}</p>;

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input name="note" maxLength={500} placeholder="审核备注（可选）" disabled={pending} className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button name="status" value="APPROVED" disabled={pending} className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">通过</button>
        <button name="status" value="REJECTED" disabled={pending} className="rounded-full bg-rose-700 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">驳回</button>
      </div>
      <p aria-live="polite" className={`text-xs ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
    </form>
  );
}
