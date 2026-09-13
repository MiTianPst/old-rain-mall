import Link from "next/link";

import type { CatalogQuery } from "./query";
import { buildCatalogHref } from "./query";

type PaginationProps = {
  query: CatalogQuery;
  totalPages: number;
};

export function Pagination({ query, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="商品分页"
      className="mt-12 flex items-center justify-center gap-2"
    >
      <PaginationLink
        href={buildCatalogHref({ ...query, page: Math.max(1, query.page - 1) })}
        disabled={query.page <= 1}
      >
        上一页
      </PaginationLink>
      <span className="px-3 text-sm text-stone-500">
        第 {query.page} / {totalPages} 页
      </span>
      <PaginationLink
        href={buildCatalogHref({
          ...query,
          page: Math.min(totalPages, query.page + 1),
        })}
        disabled={query.page >= totalPages}
      >
        下一页
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-full border border-stone-200 px-5 py-2 text-sm text-stone-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm text-stone-700 transition hover:border-amber-700 hover:text-amber-800"
    >
      {children}
    </Link>
  );
}
