export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
      <section className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_30px_100px_-50px_rgba(67,52,40,0.35)]">
        <div className="grid gap-12 px-8 py-12 sm:px-14 sm:py-16 lg:grid-cols-[1.35fr_0.65fr] lg:px-20 lg:py-20">
          <div>
            <p className="mb-8 inline-flex rounded-full bg-amber-50 px-4 py-2 text-sm font-medium tracking-[0.18em] text-amber-900">
              OLD RAIN MALL
            </p>
            <h1 className="text-5xl font-semibold tracking-[-0.05em] text-stone-900 sm:text-7xl">
              旧雨电商
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600 sm:text-xl">
              一个围绕商品、会员、购物车与订单构建的微型电商平台。
            </p>
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-stone-600">
              {["Next.js 16", "TypeScript", "Tailwind CSS 4", "MySQL"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <aside className="flex flex-col justify-between rounded-3xl bg-stone-900 p-7 text-stone-100 sm:p-9">
            <div>
              <p className="text-sm tracking-[0.2em] text-amber-300">项目状态</p>
              <p className="mt-5 text-3xl font-medium tracking-tight">
                基础工程已就绪
              </p>
              <p className="mt-4 leading-7 text-stone-400">
                下一阶段将接入数据库、用户认证、会员等级与商城核心业务。
              </p>
            </div>
            <p className="mt-12 border-t border-stone-700 pt-6 text-sm text-stone-500">
              旧雨相逢，值得被好好收藏。
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
