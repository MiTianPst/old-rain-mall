"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { createReviewAction, type ReviewActionState } from "@/app/actions/review";
import { isRatingHighlighted } from "./rating-stars";

const initialState: ReviewActionState = { status: "IDLE", message: "" };

export function ReviewForm({ orderNo, productId, orderItemId, returnTo }: { orderNo: string; productId: number; orderItemId: number; returnTo: string }) {
  const router = useRouter();
  const [selectedRating, setSelectedRating] = useState(5);
  const [state, formAction, pending] = useActionState(createReviewAction, initialState);

  useEffect(() => {
    if (state.status === "UNAUTHORIZED" && state.loginPath) router.push(state.loginPath);
  }, [router, state]);

  return (
    <form action={formAction} className="mt-4 space-y-3 rounded-2xl bg-stone-50 p-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <input type="hidden" name="orderNo" value={orderNo} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <fieldset>
        <legend className="text-sm font-medium text-stone-700">给商品打分</legend>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="商品评分">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label key={rating} className="cursor-pointer" title={`${rating} 星`}>
              <input
                className="sr-only"
                type="radio"
                name="rating"
                value={rating}
                checked={selectedRating === rating}
                onChange={() => setSelectedRating(rating)}
              />
              <span className={`text-2xl transition ${isRatingHighlighted(rating, selectedRating) ? "text-amber-500" : "text-stone-300"}`}>★</span>
              <span className="sr-only">{rating} 星</span>
            </label>
          ))}
        </div>
      </fieldset>
      <textarea name="content" required minLength={2} maxLength={1000} rows={3} placeholder="分享你的真实使用感受" disabled={pending} className="w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-700" />
      <div className="flex items-center justify-between gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-amber-800 disabled:opacity-50">{pending ? "提交中…" : "提交评价"}</button>
        <p aria-live="polite" className={`text-xs ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      </div>
    </form>
  );
}
