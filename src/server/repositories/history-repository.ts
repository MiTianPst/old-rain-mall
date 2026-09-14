import "server-only";

import { and, asc, desc, eq, exists, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, productViews, products, productVariants } from "@/db/schema";
import { catalogRepository } from "@/server/repositories/catalog-repository";
import type {
  HistoryRepository,
  HistoryViewRecord,
} from "@/server/services/history-service";

const MAX_HISTORY_SIZE = 30;

export const historyRepository: HistoryRepository = {
  async recordView({ userId, productId, now }) {
    return db.transaction(async (transaction) => {
      const [availableProduct] = await transaction
        .select({ id: products.id })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.id, productId),
            eq(products.status, "ACTIVE"),
            eq(categories.status, "ACTIVE"),
            exists(
              transaction
                .select({ id: productVariants.id })
                .from(productVariants)
                .where(
                  and(
                    eq(productVariants.productId, products.id),
                    eq(productVariants.status, "ACTIVE"),
                  ),
                ),
            ),
          ),
        )
        .limit(1)
        .for("update");

      if (!availableProduct) return { status: "PRODUCT_UNAVAILABLE" as const };

      const [existing] = await transaction
        .select({ id: productViews.id })
        .from(productViews)
        .where(and(eq(productViews.userId, userId), eq(productViews.productId, productId)))
        .limit(1)
        .for("update");

      if (existing) {
        await transaction
          .update(productViews)
          .set({
            viewCount: sql`${productViews.viewCount} + 1`,
            lastViewedAt: now,
          })
          .where(eq(productViews.id, existing.id));
      } else {
        await transaction.insert(productViews).values({
          userId,
          productId,
          viewCount: 1,
          lastViewedAt: now,
          createdAt: now,
        });
      }

      const staleRows = await transaction
        .select({ id: productViews.id })
        .from(productViews)
        .where(eq(productViews.userId, userId))
        .orderBy(asc(productViews.lastViewedAt), asc(productViews.id))
        .limit(1000)
        .offset(MAX_HISTORY_SIZE);
      if (staleRows.length > 0) {
        await transaction
          .delete(productViews)
          .where(inArray(productViews.id, staleRows.map((row) => row.id)));
      }

      return { status: "RECORDED" as const };
    });
  },

  async listRecentViews(userId, limit) {
    const rows = await db
      .select({
        productId: productViews.productId,
        lastViewedAt: productViews.lastViewedAt,
        viewCount: productViews.viewCount,
      })
      .from(productViews)
      .where(eq(productViews.userId, userId))
      .orderBy(desc(productViews.lastViewedAt), desc(productViews.id))
      .limit(Math.min(Math.max(limit, 1), MAX_HISTORY_SIZE));

    const products = await Promise.all(
      rows.map(async (row) => ({ row, product: await catalogRepository.findProductById(row.productId) })),
    );
    return products
      .filter((item): item is typeof item & { product: NonNullable<typeof item.product> } => item.product !== null)
      .map<HistoryViewRecord>(({ row, product }) => {
        const activeVariants = product.variants?.filter((variant) => variant.status === "ACTIVE") ?? [];
        return {
          lastViewedAt: row.lastViewedAt,
          viewCount: row.viewCount,
          product: {
            id: product.id,
            slug: product.slug,
            name: product.name,
            summary: product.summary,
            priceCents: product.priceCents,
            compareAtPriceCents:
              product.compareAtPriceCents !== null &&
              product.compareAtPriceCents !== undefined &&
              product.compareAtPriceCents > product.priceCents
                ? product.compareAtPriceCents
                : null,
            promotionLabel: product.promotionLabel ?? null,
            salesCount: product.salesCount ?? 0,
            stock: product.stock,
            coverUrl: product.coverUrl,
            category: product.category,
            defaultVariantId: product.defaultVariant?.id ?? null,
            activeVariantCount: activeVariants.length,
          },
        };
      });
  },

  async clearViews(userId) {
    await db.delete(productViews).where(eq(productViews.userId, userId));
  },
};
