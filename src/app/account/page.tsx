import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAccountOverview } from "@/features/account/account-overview";
import type { MembershipLevel } from "@/lib/membership";
import { formatCny } from "@/lib/money";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "个人中心",
};

const accountLinks = [
  { href: "/orders", title: "我的订单", description: "查看订单状态、物流与售后", icon: "单" },
  { href: "/cart", title: "购物车", description: "继续结算已经挑选的商品", icon: "购" },
  { href: "/account/favorites", title: "我的收藏", description: "收藏心动商品，随时回来查看", icon: "藏" },
  { href: "/addresses", title: "地址簿", description: "管理收货人与常用地址", icon: "址" },
  { href: "/account/password", title: "账户安全", description: "修改登录密码与保护账户", icon: "安" },
] as const;

export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Faccount");

  const membershipLevel = (session.user.membershipLevel ?? 0) as MembershipLevel;
  const lifetimePaidCents = session.user.lifetimePaidCents ?? 0;
  const overview = getAccountOverview({ membershipLevel, lifetimePaidCents });
  const displayName = session.user.name?.trim() || "旧雨用户";

  return (
    <main className="flex-1 bg-[#f7f3ed] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.24em] text-[#a75e32]">MY ACCOUNT</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-stone-900">个人中心</h1>
            <p className="mt-2 text-sm text-stone-500">管理你的订单、地址与心悦会员权益。</p>
          </div>
          <Link href="/#catalog" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm text-stone-700 transition hover:border-amber-700 hover:text-amber-800">
            继续逛逛
          </Link>
        </div>

        <section className="grid overflow-hidden rounded-[2rem] border border-[#ddcbb7] bg-[linear-gradient(115deg,#34271e,#59402e_60%,#8b5835)] text-white shadow-[0_30px_80px_-50px_rgba(57,38,24,0.75)] lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex items-center gap-5 border-b border-white/10 p-7 lg:border-b-0 lg:border-r lg:p-9">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-white/12 font-serif text-3xl ring-1 ring-white/20">
              {displayName.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold">{displayName}</p>
              <p className="mt-1 truncate text-sm text-stone-300">{session.user.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-[#e7bc83] px-3 py-1 text-xs font-medium text-stone-900">
                {overview.membershipLabel}
              </span>
            </div>
          </div>

          <div className="p-7 lg:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.2em] text-[#e7bc83]">心悦会员成长</p>
                <p className="mt-2 text-2xl font-semibold">当前购物享 {overview.discountLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-300">累计实付</p>
                <p className="mt-1 text-xl font-semibold text-[#f3d4aa]">{formatCny(lifetimePaidCents)}</p>
              </div>
            </div>
            <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-[#d89b5d] to-[#f4d8b3]" style={{ width: `${overview.progressPercent}%` }} />
            </div>
            <p className="mt-3 text-sm text-stone-300">
              {overview.nextMembershipLabel
                ? `再消费 ${formatCny(overview.remainingCents)} 升级为 ${overview.nextMembershipLabel}`
                : "你已达到最高会员等级，持续享受 9 折权益。"}
            </p>
          </div>
        </section>

        <section aria-labelledby="account-services-title" className="mt-8">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-[#a75e32]">快捷服务</p>
            <h2 id="account-services-title" className="mt-2 text-2xl font-semibold text-stone-900">管理我的商城生活</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {accountLinks.map((item, index) => (
              <Link key={item.href} href={item.href} className="group rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(65,45,25,0.7)] transition hover:-translate-y-1 hover:border-amber-300">
                <span className={`flex size-11 items-center justify-center rounded-2xl font-serif text-lg ${index % 2 === 0 ? "bg-[#eee0d0] text-[#9d572d]" : "bg-stone-100 text-stone-700"}`}>
                  {item.icon}
                </span>
                <h3 className="mt-5 font-semibold text-stone-900 transition group-hover:text-amber-800">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-500">{item.description}</p>
                <span className="mt-5 inline-block text-sm text-[#a75e32]">进入服务 →</span>
              </Link>
            ))}
          </div>
        </section>

        {session.user.role === "ADMIN" ? (
          <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-6 py-5">
            <div>
              <p className="font-medium text-stone-900">管理员入口</p>
              <p className="mt-1 text-sm text-stone-500">管理商品、分类、订单和商城用户。</p>
            </div>
            <Link href="/admin" className="rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white transition hover:bg-amber-800">进入管理后台</Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}
