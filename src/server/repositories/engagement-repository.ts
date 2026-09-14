import "server-only";

import { and, desc, eq, exists, inArray } from "drizzle-orm";

import { db } from "@/db";
import { categories, favorites, products, productVariants } from "@/db/schema";
import type { EngagementRepository } from "@/server/services/engagement-service";

export const engagementRepository: EngagementRepository = {
  async toggleFavorite({ userId, productId }) {
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
        .select({ id: favorites.id })
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))
        .limit(1)
        .for("update");

      if (existing) {
        await transaction.delete(favorites).where(eq(favorites.id, existing.id));
        return { status: "REMOVED" as const };
      }

      await transaction.insert(favorites).values({ userId, productId });
      return { status: "ADDED" as const };
    });
  },

  async listFavoriteProductIds(userId, productIds) {
    const rows = await db
      .select({ productId: favorites.productId })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          productIds?.length ? inArray(favorites.productId, productIds) : undefined,
        ),
      )
      .orderBy(desc(favorites.createdAt), desc(favorites.id));
    return rows.map((row) => row.productId);
  },
};
