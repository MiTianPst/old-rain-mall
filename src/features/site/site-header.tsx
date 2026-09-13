import Link from "next/link";
import { Suspense } from "react";

import { UserNavigation } from "@/features/auth/user-navigation";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200/80 bg-[#f5f3ef]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold tracking-[0.18em] text-stone-900"
        >
          旧雨电商
        </Link>
        <nav className="flex items-center gap-5 text-sm text-stone-600">
          <Link href="/" className="transition hover:text-amber-800">
            商品
          </Link>
          <Link href="/cart" className="transition hover:text-amber-800">
            购物车
          </Link>
          <Suspense
            fallback={
              <span className="rounded-full border border-stone-200 px-4 py-2 text-stone-400">
                读取中…
              </span>
            }
          >
            <UserNavigation />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
