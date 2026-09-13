import Link from "next/link";
import { z } from "zod";
import { formatCny } from "@/lib/money";
import { getAdminSession } from "@/server/admin/auth";
import { adminProductService } from "@/server/admin-products";
import { ProductRowActions } from "@/features/admin/product-row-actions";

const querySchema = z.object({ search: z.string().trim().max(200).optional().catch(undefined), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional().catch(undefined), page: z.coerce.number().int().positive().catch(1) });
export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const query = querySchema.parse(await props.searchParams); const admin = await getAdminSession();
  const result = await adminProductService.list(admin, query); if (!result.ok) return null;
  const pages = Math.max(1, Math.ceil(result.data.total / 10));
  const makeHref = (page: number) => { const p = new URLSearchParams(); if (query.search) p.set("search", query.search); if (query.status) p.set("status", query.status); p.set("page", String(page)); return `/admin/products?${p}`; };
  return <main><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm tracking-[0.2em] text-amber-800">商品资料</p><h1 className="mt-2 text-3xl font-semibold">商品管理</h1></div><Link href="/admin/products/new" className="rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white hover:bg-amber-800">新增商品</Link></div>
    <form className="mt-6 flex flex-wrap gap-3 rounded-2xl bg-white p-4"><input name="search" defaultValue={query.search} placeholder="搜索名称或 slug" className="min-w-56 flex-1 rounded-xl border border-stone-300 px-4 py-2" /><select name="status" defaultValue={query.status ?? ""} className="rounded-xl border border-stone-300 px-4 py-2"><option value="">全部状态</option><option value="DRAFT">草稿</option><option value="ACTIVE">上架</option><option value="ARCHIVED">归档</option></select><button className="rounded-full bg-stone-800 px-5 py-2 text-white">筛选</button></form>
    <div className="mt-6 overflow-x-auto rounded-3xl border border-stone-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-stone-50 text-stone-500"><tr><th className="p-4">商品</th><th className="p-4">分类</th><th className="p-4">价格</th><th className="p-4">库存</th><th className="p-4">状态</th><th className="p-4 text-right">操作</th></tr></thead><tbody>{result.data.items.map((product) => <tr key={product.id} className="border-t border-stone-100"><td className="p-4"><p className="font-medium">{product.name}</p><p className="text-xs text-stone-400">{product.slug}</p></td><td className="p-4">{product.categoryName}</td><td className="p-4">{formatCny(product.priceCents)}</td><td className="p-4">{product.stock}</td><td className="p-4">{{ DRAFT: "草稿", ACTIVE: "上架", ARCHIVED: "归档" }[product.status]}</td><td className="p-4"><ProductRowActions id={product.id} version={product.version} archived={product.status === "ARCHIVED"} /></td></tr>)}</tbody></table>{result.data.items.length === 0 ? <p className="p-12 text-center text-stone-500">没有符合条件的商品</p> : null}</div>
    <div className="mt-6 flex justify-end gap-3"><Link aria-disabled={query.page <= 1} href={makeHref(Math.max(1, query.page - 1))} className="rounded-full border border-stone-300 px-4 py-2 text-sm">上一页</Link><span className="py-2 text-sm text-stone-500">{query.page} / {pages}</span><Link aria-disabled={query.page >= pages} href={makeHref(Math.min(pages, query.page + 1))} className="rounded-full border border-stone-300 px-4 py-2 text-sm">下一页</Link></div></main>;
}
