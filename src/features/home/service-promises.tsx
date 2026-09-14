const promises = [
  ["包", "全场包邮", "当前所有订单均免运费"],
  ["真", "正品保障", "真实商品资料与库存"],
  ["退", "售后服务", "支持订单售后申请"],
  ["查", "订单追踪", "发货和物流状态可查看"],
] as const;

export function ServicePromises() {
  return (
    <section aria-label="服务保障" className="border-y border-stone-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-px px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {promises.map(([icon, title, copy]) => (
          <div key={title} className="flex items-center gap-4 px-2 py-7 lg:px-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-stone-300 font-serif text-lg text-stone-800">{icon}</span>
            <div><h2 className="text-sm font-semibold text-stone-900">{title}</h2><p className="mt-1 text-xs text-stone-500">{copy}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
