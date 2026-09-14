import Link from "next/link";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-stone-100">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[13rem_1fr] lg:px-8">
        <aside className="h-fit rounded-3xl bg-stone-900 p-5 text-white lg:sticky lg:top-6">
          <p className="text-xs tracking-[0.25em] text-amber-300">旧雨管理台</p>
          <nav className="mt-6 space-y-1 text-sm">
            <Link href="/admin" className="block rounded-xl px-3 py-2.5 hover:bg-stone-800">后台概览</Link>
            <Link href="/admin/products" className="block rounded-xl px-3 py-2.5 hover:bg-stone-800">商品管理</Link>
            <Link href="/admin/categories" className="block rounded-xl px-3 py-2.5 hover:bg-stone-800">分类管理</Link>
            <Link href="/admin/orders" className="block rounded-xl px-3 py-2.5 hover:bg-stone-800">订单管理</Link>
            <Link href="/admin/users" className="block rounded-xl px-3 py-2.5 hover:bg-stone-800">用户与会员</Link>
            <Link href="/admin/reviews" className="block rounded-xl px-3 py-2.5 hover:bg-stone-800">评价审核</Link>
            <Link href="/admin/audit-logs" className="block rounded-xl px-3 py-2.5 hover:bg-stone-800">操作审计</Link>
          </nav>
          <Link href="/" className="mt-6 block border-t border-stone-700 px-3 pt-5 text-sm text-stone-400 hover:text-amber-300">← 返回商城</Link>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
