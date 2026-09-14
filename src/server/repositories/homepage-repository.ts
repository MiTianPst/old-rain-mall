import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  notInArray,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  orderItems,
  orders,
  payments,
  productImages,
  products,
  productVariants,
} from "@/db/schema";
import type {
  HomepageProductRecord,
  HomepageRepository,
} from "@/server/services/homepage-service";

const excludedSalesStatuses: ("CANCELLED" | "CLOSED" | "REFUNDED")[] = [
  "CANCELLED",
  "CLOSED",
  "REFUNDED",
];

const publicProductCondition = and(
  eq(products.status, "ACTIVE"),
  eq(categories.status, "ACTIVE"),
  exists(
    db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, products.id),
          eq(productVariants.status, "ACTIVE"),
        ),
      ),
  ),
);

const baseSelection = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  summary: products.summary,
  priceCents: products.priceCents,
  stock: products.stock,
  coverUrl: products.coverUrl,
  compareAtPriceCents: products.compareAtPriceCents,
  promotionLabel: products.promotionLabel,
  category: {
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
  },
};

type HomepageBaseRow = typeof baseSelection extends Record<string, unknown>
  ? {
      id: number;
      slug: string;
      name: string;
      summary: string | null;
      priceCents: number;
      stock: number;
      coverUrl: string | null;
      compareAtPriceCents: number | null;
      promotionLabel: string | null;
      category: { id: number; name: string; slug: string };
      salesCount?: number;
    }
  : never;

export const homepageRepository: HomepageRepository = {
  async listFeatured(limit) {
    const rows = await db
      .select(baseSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(publicProductCondition, eq(products.isFeatured, true)))
      .orderBy(
        asc(products.featuredSort),
        desc(products.createdAt),
        desc(products.id),
      )
      .limit(limit);

    return hydrateHomepageProducts(rows);
  },

  async listNewest(limit) {
    const rows = await db
      .select(baseSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(publicProductCondition)
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(limit);

    return hydrateHomepageProducts(rows);
  },

  async listBestSelling(limit) {
    const salesCount = sql<number>`sum(${orderItems.quantity})`.mapWith(Number);
    const rows = await db
      .select({ ...baseSelection, salesCount })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(
        and(
          publicProductCondition,
          eq(payments.status, "SUCCESS"),
          notInArray(orders.status, excludedSalesStatuses),
        ),
      )
      .groupBy(
        products.id,
        products.slug,
        products.name,
        products.summary,
        products.priceCents,
        products.stock,
        products.coverUrl,
        products.compareAtPriceCents,
        products.promotionLabel,
        products.createdAt,
        categories.id,
        categories.name,
        categories.slug,
      )
      .orderBy(desc(salesCount), desc(products.createdAt), desc(products.id))
      .limit(limit);

    return hydrateHomepageProducts(rows);
  },
};

async function hydrateHomepageProducts(
  rows: HomepageBaseRow[],
): Promise<HomepageProductRecord[]> {
  if (rows.length === 0) return [];

  const productIds = rows.map((row) => row.id);
  const [variants, images, salesRows] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        priceCents: productVariants.priceCents,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .where(
        and(
          inArray(productVariants.productId, productIds),
          eq(productVariants.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(productVariants.productId), asc(productVariants.id)),
    db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        isPrimary: productImages.isPrimary,
        sortOrder: productImages.sortOrder,
        id: productImages.id,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(
        asc(productImages.productId),
        desc(productImages.isPrimary),
        asc(productImages.sortOrder),
        asc(productImages.id),
      ),
    loadSalesCounts(productIds),
  ]);

  const variantsByProduct = new Map<
    number,
    (typeof variants)[number][]
  >();
  for (const variant of variants) {
    const current = variantsByProduct.get(variant.productId) ?? [];
    current.push(variant);
    variantsByProduct.set(variant.productId, current);
  }

  const coverByProduct = new Map<number, string>();
  for (const image of images) {
    if (!coverByProduct.has(image.productId)) {
      coverByProduct.set(image.productId, image.url);
    }
  }
  const salesByProduct = new Map(
    salesRows.map((row) => [row.productId, row.salesCount]),
  );

  return rows.flatMap((row) => {
    const activeVariants = variantsByProduct.get(row.id) ?? [];
    const defaultVariant = activeVariants[0];
    if (!defaultVariant) return [];

    return [
      {
        ...row,
        priceCents: defaultVariant.priceCents,
        stock: activeVariants.reduce((total, variant) => total + variant.stock, 0),
        coverUrl: coverByProduct.get(row.id) ?? row.coverUrl,
        defaultVariantId: defaultVariant.id,
        activeVariantCount: activeVariants.length,
        salesCount: row.salesCount ?? salesByProduct.get(row.id) ?? 0,
      },
    ];
  });
}

function loadSalesCounts(productIds: number[]) {
  const salesCount = sql<number>`sum(${orderItems.quantity})`.mapWith(Number);
  return db
    .select({ productId: orderItems.productId, salesCount })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        inArray(orderItems.productId, productIds),
        eq(payments.status, "SUCCESS"),
        notInArray(orders.status, excludedSalesStatuses),
      ),
    )
    .groupBy(orderItems.productId);
}
