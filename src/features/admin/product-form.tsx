"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createAdminProductAction, updateAdminProductAction, type AdminProductActionState } from "@/app/actions/admin-product";
import type { AdminCategoryOption, AdminProductRecord } from "@/server/services/admin-product-service";

const initialState: AdminProductActionState = { status: "IDLE", message: "" };
const fieldClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:bg-stone-100";

function ErrorText({ errors, name }: { errors?: Record<string, string[]>; name: string }) {
  return errors?.[name]?.[0] ? <span className="mt-1 block text-xs text-rose-700">{errors[name]![0]}</span> : null;
}

export function AdminProductForm({ product, categories }: { product?: AdminProductRecord; categories: AdminCategoryOption[] }) {
  const [state, action, pending] = useActionState(product ? updateAdminProductAction : createAdminProductAction, initialState);
  return (
    <form action={action} className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 lg:p-8">
      {product ? <><input type="hidden" name="id" value={product.id} /><input type="hidden" name="version" value={product.version} /></> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">商品名称<input name="name" defaultValue={product?.name} maxLength={200} required disabled={pending} className={fieldClass} /><ErrorText errors={state.fieldErrors} name="name" /></label>
        <label className="text-sm font-medium">商品标识（slug）<input name="slug" defaultValue={product?.slug} maxLength={220} required disabled={pending} className={fieldClass} /><ErrorText errors={state.fieldErrors} name="slug" /></label>
        <label className="text-sm font-medium">分类<select name="categoryId" defaultValue={product?.categoryId ?? ""} required disabled={pending} className={fieldClass}><option value="" disabled>请选择分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.status === "HIDDEN" ? "（已隐藏）" : ""}</option>)}</select><ErrorText errors={state.fieldErrors} name="categoryId" /></label>
        <label className="text-sm font-medium">状态<select name="status" defaultValue={product?.status ?? "DRAFT"} disabled={pending} className={fieldClass}><option value="DRAFT">草稿</option><option value="ACTIVE">上架</option><option value="ARCHIVED">归档</option></select><ErrorText errors={state.fieldErrors} name="status" /></label>
        <label className="text-sm font-medium">价格（元）<input name="priceYuan" inputMode="decimal" defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""} required disabled={pending} className={fieldClass} /><ErrorText errors={state.fieldErrors} name="priceYuan" /></label>
        <label className="text-sm font-medium">商品原价（元）<input name="compareAtPriceYuan" inputMode="decimal" defaultValue={product?.compareAtPriceCents ? (product.compareAtPriceCents / 100).toFixed(2) : ""} disabled={pending} className={fieldClass} placeholder="留空则不显示划线价" /><ErrorText errors={state.fieldErrors} name="compareAtPriceYuan" /></label>
        <label className="text-sm font-medium">推荐顺序<input name="featuredSort" type="number" min="0" max="9999" defaultValue={product?.featuredSort ?? 0} disabled={pending} className={fieldClass} /><ErrorText errors={state.fieldErrors} name="featuredSort" /></label>
        <label className="text-sm font-medium">促销标签<input name="promotionLabel" defaultValue={product?.promotionLabel} maxLength={30} disabled={pending} className={fieldClass} placeholder="例如：新品首发" /><ErrorText errors={state.fieldErrors} name="promotionLabel" /></label>
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium"><input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} disabled={pending} className="size-4 accent-amber-700" />加入首页推荐</label>
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">商品库存请在下方 SKU 管理区调整，商品资料保存不会覆盖 SKU 库存。</p>
      <label className="block text-sm font-medium">商品摘要<input name="summary" defaultValue={product?.summary} maxLength={500} disabled={pending} className={fieldClass} /><ErrorText errors={state.fieldErrors} name="summary" /></label>
      <label className="block text-sm font-medium">商品描述<textarea name="description" defaultValue={product?.description} rows={6} disabled={pending} className={fieldClass} /><ErrorText errors={state.fieldErrors} name="description" /></label>
      <label className="block text-sm font-medium">封面图片地址<input name="coverUrl" type="url" defaultValue={product?.coverUrl} maxLength={1000} disabled={pending} className={fieldClass} /><ErrorText errors={state.fieldErrors} name="coverUrl" /></label>
      <p aria-live="polite" className="min-h-5 text-sm text-rose-700">{state.status === "ERROR" ? state.message : ""}</p>
      <div className="flex gap-3"><button disabled={pending} className="rounded-full bg-stone-900 px-6 py-3 font-medium text-white hover:bg-amber-800 disabled:opacity-50">{pending ? "保存中…" : "保存商品"}</button><Link href="/admin/products" className="rounded-full border border-stone-300 px-6 py-3 text-sm">取消</Link></div>
    </form>
  );
}
