"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  toggleFavoriteAction,
  type FavoriteActionState,
} from "@/app/actions/favorite";

const initialState = {
  status: "IDLE" as const,
  message: "",
  favorited: false,
};

type FavoriteButtonProps = {
  productId: number;
  favorited?: boolean;
  returnTo: string;
};

export function FavoriteButton({
  productId,
  favorited = false,
  returnTo,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    FavoriteActionState,
    FormData
  >(toggleFavoriteAction, { ...initialState, favorited });

  useEffect(() => {
    if (state.status === "UNAUTHORIZED" && state.loginPath) {
      router.push(state.loginPath);
    }
  }, [router, state]);

  const active = state.status === "SUCCESS" ? state.favorited : state.favorited;

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        disabled={pending}
        aria-label={active ? "取消收藏" : "收藏商品"}
        title={active ? "取消收藏" : "收藏商品"}
        className={`flex size-10 items-center justify-center rounded-full border backdrop-blur transition disabled:cursor-wait disabled:opacity-60 ${
          active
            ? "border-amber-200 bg-amber-100 text-amber-800"
            : "border-white/70 bg-white/85 text-stone-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
        }`}
      >
        <span aria-hidden className="text-lg leading-none">
          {active ? "♥" : "♡"}
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {state.message}
      </span>
    </form>
  );
}
