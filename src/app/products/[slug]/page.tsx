import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { ProductVisual } from "@/features/catalog/product-visual";
import { formatCny } from "@/lib/money";
import { catalogService } from "@/server/catalog";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await catalogService.getProductBySlug(slug);

  return product
    ? {
        title: product.name,
        description: product.summary ?? product.description,
      }
    : { title: "商品不存在" };
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await catalogService.getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-8 lg:py-16">
      <Link
        href="/"
        className="text-sm text-stone-500 transition hover:text-amber-800"
      >
        ← 返回商品列表
      </Link>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductVisual
          productId={product.id}
          name={product.name}
          coverUrl={product.coverUrl}
          priority
          large
        />

        <div className="lg:pt-5">
          <Link
            href={`/?category=${encodeURIComponent(product.category.slug)}`}
            className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900"
          >
            {product.category.name}
          </Link>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-stone-900 sm:text-5xl">
            {product.name}
          </h1>
          {product.summary ? (
            <p className="mt-5 text-lg leading-8 text-stone-600">
              {product.summary}
            </p>
          ) : null}
          <p className="mt-8 text-3xl font-semibold text-amber-800">
            {formatCny(product.priceCents)}
          </p>

          <div className="mt-8 flex items-center justify-between border-y border-stone-200 py-5 text-sm">
            <span className="text-stone-500">库存状态</span>
            <span
              className={product.stock > 0 ? "text-emerald-700" : "text-rose-700"}
            >
              {product.stock > 0 ? `现货 ${product.stock} 件` : "暂时售罄"}
            </span>
          </div>

          <AddToCartButton
            productId={product.id}
            returnTo={`/products/${product.slug}`}
            disabled={product.stock <= 0}
          />

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-stone-900">商品详情</h2>
            <p className="mt-4 whitespace-pre-line leading-8 text-stone-600">
              {product.description ?? product.summary ?? "暂无更多商品描述。"}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
