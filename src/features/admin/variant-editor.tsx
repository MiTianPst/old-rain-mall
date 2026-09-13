"use client";

import { useActionState, useState } from "react";

import { updateAdminVariantsAction, type AdminProductActionState } from "@/app/actions/admin-product";
import type { AdminVariantRecord } from "@/server/services/admin-product-service";
import { InventoryAdjustmentForm } from "./inventory-adjustment-form";
import { LowStockBadge } from "./low-stock-badge";

type EditableVariant = Omit<AdminVariantRecord, "attributes"> & { attributesText: string };
const initialState: AdminProductActionState = { status: "IDLE", message: "" };
const inputClass = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100";

function serializeVariants(variants: EditableVariant[]) {
  return JSON.stringify(variants.map(({ attributesText, id, ...variant }) => {
    try {
      const attributes: unknown = JSON.parse(attributesText);
      return { ...variant, ...(id > 0 ? { id } : {}), attributes };
    } catch { return { ...variant, ...(id > 0 ? { id } : {}), attributes: null }; }
  }));
}

export function VariantEditor({ productId, version, variants: initialVariants }: { productId: number; version: number; variants: AdminVariantRecord[] }) {
  const [variants, setVariants] = useState<EditableVariant[]>(initialVariants.map((variant) => ({ ...variant, attributesText: JSON.stringify(variant.attributes, null, 2) })));
  const [state, action, pending] = useActionState(updateAdminVariantsAction, initialState);
  const update = (index: number, change: Partial<EditableVariant>) => setVariants((current) => current.map((variant, itemIndex) => itemIndex === index ? { ...variant, ...change } : variant));
  const add = () => setVariants((current) => [...current, { id: -Date.now(), skuCode: "", name: "", attributesText: "{}", priceYuan: "", stock: 0, status: "ACTIVE" }]);
  const removeOrArchive = (index: number) => setVariants((current) => {
    const target = current[index]!;
    return target.id > 0 ? current.map((variant, itemIndex) => itemIndex === index ? { ...variant, status: "ARCHIVED" } : variant) : current.filter((_, itemIndex) => itemIndex !== index);
  });

  return (
    <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">SKU 管理</h2><p className="mt-1 text-sm text-stone-500">编辑编码、规格与价格；既有库存请使用库存调整。</p></div><button type="button" onClick={add} className="rounded-full border border-stone-300 px-4 py-2 text-sm">新增 SKU</button></div>
      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="version" value={version} />
        <input type="hidden" name="variants" value={serializeVariants(variants)} />
        {variants.map((variant, index) => (
          <div key={variant.id} className="rounded-2xl border border-stone-200 p-4">
            <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-sm font-medium">{variant.id > 0 ? `SKU #${variant.id}` : "新 SKU"}</span>{variant.status === "ACTIVE" ? <LowStockBadge stock={variant.stock} /> : <span className="text-xs text-stone-400">已归档</span>}</div><button type="button" onClick={() => removeOrArchive(index)} disabled={pending || variant.status === "ARCHIVED"} className="text-sm text-rose-700 disabled:text-stone-300">{variant.id > 0 ? "归档" : "移除"}</button></div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-stone-500">SKU 编码<input value={variant.skuCode} onChange={(event) => update(index, { skuCode: event.target.value })} required disabled={pending} className={`mt-1 ${inputClass}`} /></label>
              <label className="text-xs text-stone-500">规格名称<input value={variant.name} onChange={(event) => update(index, { name: event.target.value })} required disabled={pending} className={`mt-1 ${inputClass}`} /></label>
              <label className="text-xs text-stone-500">价格（元）<input value={variant.priceYuan} onChange={(event) => update(index, { priceYuan: event.target.value })} inputMode="decimal" required disabled={pending} className={`mt-1 ${inputClass}`} /></label>
              <label className="text-xs text-stone-500 md:col-span-2">规格 JSON<textarea value={variant.attributesText} onChange={(event) => update(index, { attributesText: event.target.value })} rows={2} required disabled={pending} className={`mt-1 ${inputClass}`} /></label>
              <label className="text-xs text-stone-500">库存<input value={variant.stock} onChange={(event) => update(index, { stock: Number(event.target.value) })} type="number" min={0} step={1} required disabled={pending || variant.id > 0} className={`mt-1 ${inputClass}`} /></label>
              <label className="text-xs text-stone-500">状态<select value={variant.status} onChange={(event) => update(index, { status: event.target.value as EditableVariant["status"] })} disabled={pending} className={`mt-1 ${inputClass}`}><option value="ACTIVE">在售</option><option value="ARCHIVED">归档</option></select></label>
            </div>
            {variant.id > 0 ? <InventoryAdjustmentForm variantId={variant.id} /> : null}
          </div>
        ))}
        {variants.length === 0 ? <p className="rounded-xl bg-stone-50 p-5 text-center text-sm text-stone-500">请至少新增一个在售 SKU</p> : null}
        <p aria-live="polite" className={state.status === "SUCCESS" ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p>
        <button disabled={pending} className="rounded-full bg-stone-900 px-6 py-3 font-medium text-white disabled:opacity-50">{pending ? "保存中…" : "保存 SKU"}</button>
      </form>
    </section>
  );
}
