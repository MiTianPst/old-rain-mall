"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("页面加载失败", { name: error.name, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium tracking-[0.24em] text-[#a75e32]">旧雨电商</p>
      <h1 className="mt-4 text-3xl font-semibold text-stone-900">页面暂时没有加载成功</h1>
      <p className="mt-3 text-sm leading-6 text-stone-500">可能是服务暂时繁忙，请稍后重新加载。</p>
      <button onClick={reset} className="mt-7 min-h-11 rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition hover:bg-amber-800">重新加载</button>
    </main>
  );
}
