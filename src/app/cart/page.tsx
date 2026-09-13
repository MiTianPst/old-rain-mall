import Link from "next/link";
import { redirect } from "next/navigation";

import { CartItemActions } from "@/features/cart/cart-item-actions";
import { ProductVisual } from "@/features/catalog/product-visual";
import { formatCny } from "@/lib/money";
import { getCurrentSession } from "@/server/auth/session";
import { cartService } from "@/server/cart";

export default async function CartPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Fcart");

  const cart = await cartService.listItems(session.user.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <p className="text-sm tracking-[0.25em] text-amber-800">我的选物</p>
      <div className="mt-3 flex items-end justify-between gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
          购物车
        </h1>
        <span className="text-sm text-stone-500">
          可结算 {cart.totalQuantity} 件
        </span>
      </div>

      {cart.data.length === 0 ? (
        <section className="mt-10 rounded-[2rem] border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
          <p className="text-xl font-medium">购物车还是空的</p>
          <p className="mt-2 text-sm text-stone-500">去挑一件喜欢的商品吧。</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-amber-800"
          >
            浏览商品
          </Link>
        </section>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            {cart.data.map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-[7rem_1fr] gap-5 rounded-3xl border border-stone-200 bg-white p-4"
              >
                <Link href={`/products/${item.product.slug}`} className="group">
                  <ProductVisual
                    productId={item.product.id}
                    name={item.product.name}
                    coverUrl={item.product.coverUrl}
                  />
                </Link>
                <div className="flex min-w-0 flex-col justify-center">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-semibold text-stone-900 hover:text-amber-800"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-xs text-stone-500">
                    {item.product.variantName || "默认规格"}
                    {Object.values(item.product.variantAttributes).length > 0
                      ? ` · ${Object.values(item.product.variantAttributes).join(" / ")}`
                      : ""}
                  </p>
                  <p className="mt-2 text-sm text-stone-500">
                    {formatCny(item.product.priceCents)} × {item.quantity}
                  </p>
                  <p className="mt-3 font-medium text-amber-800">
                    {formatCny(item.lineTotalCents)}
                  </p>
                  {!item.available ? (
                    <p className="mt-2 text-xs text-rose-700">
                      商品已下架、分类隐藏或库存不足，暂不可结算
                    </p>
                  ) : null}
                  <CartItemActions
                    cartItemId={item.id}
                    quantity={item.quantity}
                    stock={item.product.stock}
                    canUpdate={item.available}
                  />
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-3xl bg-stone-900 p-6 text-white">
            <p className="text-sm text-stone-400">商品合计</p>
            <p className="mt-3 text-3xl font-semibold">{formatCny(cart.totalCents)}</p>
            <p className="mt-5 text-sm leading-6 text-stone-400">
              结算时会重新校验库存、商品价格和会员折扣。
            </p>
            {cart.totalQuantity > 0 ? (
              <Link
                href="/checkout"
                className="mt-6 flex w-full justify-center rounded-full bg-amber-300 px-5 py-3 font-medium text-stone-900 transition hover:bg-amber-200"
              >
                去结算
              </Link>
            ) : (
              <span className="mt-6 flex w-full cursor-not-allowed justify-center rounded-full bg-stone-700 px-5 py-3 text-stone-400">
                暂无可结算商品
              </span>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
