import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { ReviewManagementActions } from "@/features/admin/review-management-actions";
import { formatOrderTime } from "@/features/order/presentation";
import { getAdminSession } from "@/server/admin/auth";
import { reviewService } from "@/server/review";

export const metadata: Metadata = { title: "评价管理" };

const querySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
});

export default async function AdminReviewsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await getAdminSession();
  if (!admin) return null;
  const query = querySchema.parse(await props.searchParams);
  const result = await reviewService.listAdmin({ page: query.page, pageSize: 20 });
  const totalPages = Math.max(1, Math.ceil(result.total / 20));
  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    const value = params.toString();
    return value ? `/admin/reviews?${value}` : "/admin/reviews";
  };

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm tracking-[0.2em] text-amber-800">用户内容</p><h1 className="mt-2 text-3xl font-semibold">评价管理</h1><p className="mt-2 text-sm text-stone-500">查看用户评价内容，必要时删除不当评价。</p></div>
        <Link href="/admin" className="text-sm text-stone-500 hover:text-amber-800">返回后台概览 →</Link>
      </div>

      <div className="mt-6 space-y-4">
        {result.items.map((review) => (
          <article key={review.id} className="rounded-3xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-stone-900">{review.productName}</p>
                <p className="mt-1 text-xs text-stone-500">订单 {review.orderNo} · {review.userName}（{review.userEmail}）</p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">{"★".repeat(review.rating)}</span>
            </div>
            <p className="mt-4 whitespace-pre-line rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-700">{review.content}</p>
            <p className="mt-3 text-xs text-stone-400">提交于 {formatOrderTime(review.createdAt)}</p>
            <ReviewManagementActions reviewId={review.id} />
          </article>
        ))}
      </div>
      {result.items.length === 0 ? <p className="mt-6 rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500">没有符合条件的评价</p> : null}
      <div className="mt-6 flex justify-end gap-3"><Link href={buildHref(Math.max(1, query.page - 1))} className="rounded-full border border-stone-300 px-4 py-2 text-sm">上一页</Link><span className="py-2 text-sm text-stone-500">{query.page} / {totalPages}</span><Link href={buildHref(Math.min(totalPages, query.page + 1))} className="rounded-full border border-stone-300 px-4 py-2 text-sm">下一页</Link></div>
    </main>
  );
}
