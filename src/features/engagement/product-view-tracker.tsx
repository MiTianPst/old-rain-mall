"use client";

import { useEffect, useRef } from "react";
import { startTransition } from "react";

import { recordProductViewAction } from "@/app/actions/history";

export function ProductViewTracker({ productId, enabled }: { productId: number; enabled: boolean }) {
  const recorded = useRef(false);

  useEffect(() => {
    if (!enabled || recorded.current) return;
    recorded.current = true;
    const task = async () => {
      await recordProductViewAction(productId);
    };
    startTransition(() => {
      void task();
    });
  }, [enabled, productId]);

  return null;
}
