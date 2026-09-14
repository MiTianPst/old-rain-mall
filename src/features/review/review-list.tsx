import type { PublicReviewRecord } from "@/server/services/review-service";

export function ReviewList({ reviews }: { reviews: PublicReviewRecord[] }) {
  const average = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;

  return (
    <section className="mt-12 border-t border-stone-200 pt-10" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-[#a75e32]">REAL REVIEWS</p>
          <h2 id="reviews-title" className="mt-2 text-2xl font-semibold text-stone-900">真实评价</h2>
        </div>
        <p className="text-sm text-stone-500">
          {reviews.length > 0 ? <><span className="text-lg font-semibold text-amber-700">{average.toFixed(1)}</span> / 5 · {reviews.length} 条已审核评价</> : "暂时还没有公开评价"}
        </p>
      </div>
      {reviews.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-stone-800">{review.userName || "旧雨用户"}</p>
                <span className="text-amber-500" aria-label={`${review.rating} 星`}>{"★".repeat(review.rating)}<span className="text-stone-200">{"★".repeat(5 - review.rating)}</span></span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-600">{review.content}</p>
              <time className="mt-3 block text-xs text-stone-400" dateTime={review.createdAt.toISOString()}>{formatReviewDate(review.createdAt)}</time>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatReviewDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "numeric", day: "numeric" }).format(value);
}
