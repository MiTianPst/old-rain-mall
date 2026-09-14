import Link from "next/link";

const highlights = [
  { eyebrow: "限时优惠", title: "价格刚刚好，喜欢不必等", copy: "精选商品限时直降，会员结算继续享受对应等级折扣。", href: "#featured-products", tone: "from-[#f1e1ce] to-[#fbf7f1]" },
  { eyebrow: "新品首发", title: "把新鲜科技，带进日常", copy: "按真实上架时间更新，第一时间发现新加入旧雨的好物。", href: "#new-products", tone: "from-[#e4ebe5] to-[#f7f8f4]" },
  { eyebrow: "热销排行", title: "大家正在买的科技好物", copy: "榜单来自真实已支付订单，不使用虚构销量。", href: "#best-selling", tone: "from-[#e6e4e1] to-[#faf8f5]" },
] as const;

export function CommerceHighlights() {
  return (
    <section aria-label="商城精选入口" className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-3">
        {highlights.map((item) => (
          <Link key={item.eyebrow} href={item.href} className={`group rounded-[2rem] bg-gradient-to-br ${item.tone} p-6 transition hover:-translate-y-0.5`}>
            <p className="text-xs font-medium tracking-[0.22em] text-[#a75e32]">{item.eyebrow}</p>
            <h2 className="mt-5 max-w-xs font-serif text-2xl font-semibold leading-tight text-stone-900">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{item.copy}</p>
            <span className="mt-6 inline-flex min-h-10 items-center rounded-full bg-white/80 px-4 text-sm font-medium text-stone-800 shadow-sm transition group-hover:text-amber-800">去看看 →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
