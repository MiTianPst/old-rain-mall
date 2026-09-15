"use client";

import { useActionState } from "react";

import { deleteReviewAction, type DeleteReviewActionState } from "@/app/actions/review";

const initialState: DeleteReviewActionState = { status: "IDLE", message: "" };

export function ReviewManagementActions({ reviewId }: { reviewId: number }) {
  const [state, formAction, pending] = useActionState(deleteReviewAction, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
      <input type="hidden" name="reviewId" value={reviewId} />
      <p aria-live="polite" className={`text-xs ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm("确定删除这条评价吗？删除后无法恢复。")) event.preventDefault();
        }}
        className="rounded-full border border-rose-300 px-4 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "正在删除…" : "删除评价"}
      </button>
    </form>
  );
}
