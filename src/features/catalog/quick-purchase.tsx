"use client";

import Link from "next/link";

import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import {
  getQuickPurchaseMode,
  type QuickPurchaseInput,
} from "./quick-purchase-mode";

export function QuickPurchase({ product }: { product: QuickPurchaseInput }) {
  const mode = getQuickPurchaseMode(product);

  if (mode.type === "SOLD_OUT") {
    return (
      <span className="flex min-h-11 items-center justify-center rounded-full bg-stone-100 px-4 text-sm text-stone-400">
        暂时售罄
      </span>
    );
  }

  if (mode.type === "SELECT") {
    return (
      <Link
        href={mode.href}
        className="flex min-h-11 items-center justify-center rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:text-amber-800"
      >
        选择规格
      </Link>
    );
  }

  return (
    <AddToCartButton
      variantId={mode.variantId}
      returnTo="/"
      disabled={false}
      compact
    />
  );
}
