import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductVisual } from "@/features/catalog/product-visual";
import { RelatedProducts } from "@/features/catalog/related-products";
import { VariantSelection } from "@/features/catalog/variant-selection";
import { FavoriteButton } from "@/features/engagement/favorite-button";
import { ProductViewTracker } from "@/features/engagement/product-view-tracker";
import { ReviewList } from "@/features/review/review-list";
import { type MembershipLevel } from "@/lib/membership";
import { getCurrentSession } from "@/server/auth/session";
import { catalogService } from "@/server/catalog";
import { engagementService } from "@/server/engagement";
import { reviewService } from "@/server/review";

import { getProductImageUrl } from "@/features/catalog/image";

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
  const [product, session] = await Promise.all([
    catalogService.getProductBySlug(slug),
    getCurrentSession(),
  ]);
  if (!product) notFound();
  const [reviews, relatedProducts] = await Promise.all([
    reviewService.listPublic(product.id),
    catalogService.listRelatedProducts({ productId: product.id, categoryId: product.category.id, limit: 4 }),
  ]);
  const membershipLevel = (session?.user.membershipLevel ?? 0) as MembershipLevel;
  const favoriteProductIds = await engagementService.listFavoriteProductIds(
    session?.user.id ?? null,
    [product.id],
  );
  const galleryImages = (product.images ?? [])
    .map((image) => ({ ...image, src: getProductImageUrl(image.url) }))
    .filter((image): image is typeof image & { src: string } => image.src !== null);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-8 lg:py-16">
      <ProductViewTracker productId={product.id} enabled={Boolean(session)} />
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
                unoptimized={galleryImages[0].src.startsWith("https://")}
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
                      unoptimized={image.src.startsWith("https://")}
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
          <div className="mt-5 flex items-start justify-between gap-4">
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-stone-900 sm:text-5xl">
              {product.name}
            </h1>
            <FavoriteButton
              productId={product.id}
              favorited={favoriteProductIds.includes(product.id)}
              returnTo={`/products/${product.slug}`}
            />
          </div>
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
      <ReviewList reviews={reviews} />
      <RelatedProducts products={relatedProducts} membershipLevel={membershipLevel} isAuthenticated={Boolean(session)} />
    </main>
  );
}
