"use client";

import { useRouter } from "next/navigation";

export function BuyNowButton({ variantId, disabled }: { variantId: number; disabled: boolean }) {
  const router = useRouter();

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => router.push(`/checkout?buyNowVariantId=${variantId}`)}
        className="min-h-11 w-full rounded-full border border-amber-700 bg-amber-50 px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
      >
        {disabled ? "暂时售罄" : "立即购买"}
      </button>
      <p aria-hidden="true" className="mt-2 min-h-5" />
    </div>
  );
}
