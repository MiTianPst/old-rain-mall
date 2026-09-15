"use client";

import { useState } from "react";

import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { BuyNowButton } from "@/features/cart/buy-now-button";
import { formatCny } from "@/lib/money";
import type { ProductVariantDto } from "@/server/services/catalog-service";

type VariantSelectionProps = {
  variants: ProductVariantDto[];
  defaultVariant?: ProductVariantDto | null;
  returnTo: string;
};

export function VariantSelection({
  variants,
  defaultVariant,
  returnTo,
}: VariantSelectionProps) {
  const activeVariants = variants.filter((variant) => variant.status === "ACTIVE");
  const initialVariantId = defaultVariant?.id ?? activeVariants[0]?.id ?? null;
  const [selectedVariantId, setSelectedVariantId] =
    useState<number | null>(initialVariantId);
  const selectedVariant =
    activeVariants.find((variant) => variant.id === selectedVariantId) ??
    activeVariants[0] ??
    null;

  if (!selectedVariant) {
    return (
      <section className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-5">
        <p className="text-sm text-stone-500">暂无可售规格</p>
      </section>
    );
  }

  return (
    <section className="mt-8" aria-label="选择商品规格">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-stone-900">选择规格</h2>
        <span className="text-xs text-stone-500">库存实时更新</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="商品规格">
        {variants.map((variant) => {
          const disabled = variant.status !== "ACTIVE";
          const selected = selectedVariant.id === variant.id;

          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => setSelectedVariantId(variant.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-amber-700 bg-amber-50 ring-1 ring-amber-700"
                  : "border-stone-200 bg-white hover:border-amber-400"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium text-stone-900">{variant.name}</span>
                {disabled ? (
                  <span className="text-xs text-stone-500">已归档</span>
                ) : null}
              </span>
              <span className="mt-1 block text-sm text-stone-500">
                {formatVariantAttributes(variant.attributes)}
              </span>
              <span className="mt-2 block text-sm font-medium text-amber-800">
                {formatCny(variant.priceCents)} · {variant.stock > 0 ? `库存 ${variant.stock}` : "暂时售罄"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">当前规格</p>
          <p className="mt-1 text-lg font-medium text-stone-900">{selectedVariant.name}</p>
        </div>
        <p className="text-3xl font-semibold text-amber-800">
          {formatCny(selectedVariant.priceCents)}
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <AddToCartButton
          variantId={selectedVariant.id}
          returnTo={returnTo}
          disabled={selectedVariant.stock <= 0}
          compact
        />
        <BuyNowButton
          variantId={selectedVariant.id}
          disabled={selectedVariant.stock <= 0}
        />
      </div>
    </section>
  );
}

function formatVariantAttributes(attributes: Record<string, string>) {
  const entries = Object.entries(attributes);
  return entries.length > 0
    ? entries.map(([key, value]) => `${key}：${value}`).join(" · ")
    : "默认规格";
}
