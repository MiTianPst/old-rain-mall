import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductVisual } from "@/features/catalog/product-visual";
import { VariantSelection } from "@/features/catalog/variant-selection";
import { catalogService } from "@/server/catalog";

import { getLocalProductImage } from "@/features/catalog/image";

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
  const galleryImages = (product.images ?? [])
    .map((image) => ({ ...image, src: getLocalProductImage(image.url) }))
    .filter((image): image is typeof image & { src: string } => image.src !== null);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-8 lg:py-16">
      <Link
        href="/"
        className="text-sm text-stone-500 transition hover:text-amber-800"
      >
        ← 返回商品列表
      </Link>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        {galleryImages.length > 0 ? (
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-stone-100">
              <Image
                src={galleryImages[0].src}
                alt={galleryImages[0].altText ?? product.name}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            {galleryImages.length > 1 ? (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                {galleryImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square overflow-hidden rounded-xl bg-stone-100"
                  >
                    <Image
                      src={image.src}
                      alt={image.altText ?? product.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <ProductVisual
            productId={product.id}
            name={product.name}
            coverUrl={product.coverUrl}
            priority
            large
          />
        )}

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
          <VariantSelection
            variants={product.variants ?? []}
            defaultVariant={product.defaultVariant}
            returnTo={`/products/${product.slug}`}
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
