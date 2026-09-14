import Link from "next/link";

const footerGroups = [
  { title: "购物指南", links: [["全部商品", "/#catalog"], ["购物车", "/cart"], ["我的订单", "/orders"]] },
  { title: "账户服务", links: [["收货地址", "/addresses"], ["修改密码", "/account/password"], ["登录账户", "/login"]] },
  { title: "售后支持", links: [["订单管理", "/orders"], ["会员权益", "/#membership"], ["返回首页", "/"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_1.8fr] lg:px-8">
        <div>
          <p className="font-serif text-2xl font-semibold tracking-[0.12em] text-white">旧雨电商</p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-stone-400">科技，让日常多一点喜欢。认真挑选手机、电脑与智能生活好物。</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}><h2 className="text-sm font-semibold text-white">{group.title}</h2><ul className="mt-4 space-y-3 text-sm text-stone-400">{group.links.map(([label, href]) => <li key={label}><Link href={href} className="transition hover:text-amber-300">{label}</Link></li>)}</ul></div>
          ))}
        </div>
      </div>
      <div className="border-t border-stone-800 px-6 py-5 text-center text-xs text-stone-500">© 2026 旧雨电商 · 微型电商项目</div>
    </footer>
  );
}
