import "server-only";

import { and, asc, count, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { productImages, products } from "@/db/schema";
import type { ProductImageRepository, ProductImageRecord } from "@/server/services/product-image-service";

function toRecord(row: typeof productImages.$inferSelect): ProductImageRecord {
  return {
    id: row.id,
    productId: row.productId,
    url: row.url,
    altText: row.altText,
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
  };
}

export const productImageRepository: ProductImageRepository = {
  async productExists(productId) {
    const [row] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
    return Boolean(row);
  },

  async add(input) {
    return db.transaction(async (transaction) => {
      const [existing] = await transaction.select({ value: count() }).from(productImages).where(eq(productImages.productId, input.productId));
      const result = await transaction.insert(productImages).values({
        productId: input.productId,
        url: input.url,
        isPrimary: (existing?.value ?? 0) === 0,
        sortOrder: Number(existing?.value ?? 0),
      });
      const [row] = await transaction.select().from(productImages).where(eq(productImages.id, Number(result[0].insertId))).limit(1);
      if (!row) throw new Error("图片记录创建失败");
      return toRecord(row);
    });
  },

  async findById(imageId) {
    const [row] = await db.select().from(productImages).where(eq(productImages.id, imageId)).limit(1);
    return row ? toRecord(row) : null;
  },

  async remove(imageId) {
    return db.transaction(async (transaction) => {
      const [row] = await transaction.select().from(productImages).where(eq(productImages.id, imageId)).limit(1);
      if (!row) return null;
      await transaction.delete(productImages).where(eq(productImages.id, imageId));
      if (row.isPrimary) {
        const [next] = await transaction.select({ id: productImages.id }).from(productImages)
          .where(eq(productImages.productId, row.productId)).orderBy(asc(productImages.sortOrder), asc(productImages.id)).limit(1);
        if (next) await transaction.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, next.id));
      }
      return toRecord(row);
    });
  },

  async update(imageId, input) {
    return db.transaction(async (transaction) => {
      const [row] = await transaction.select().from(productImages).where(eq(productImages.id, imageId)).limit(1);
      if (!row) return null;
      if (input.isPrimary === true) {
        await transaction.update(productImages).set({ isPrimary: false }).where(and(eq(productImages.productId, row.productId), ne(productImages.id, imageId)));
      }
      await transaction.update(productImages).set({
        ...(input.isPrimary === undefined ? {} : { isPrimary: input.isPrimary }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      }).where(eq(productImages.id, imageId));
      const [updated] = await transaction.select().from(productImages).where(eq(productImages.id, imageId)).limit(1);
      return updated ? toRecord(updated) : null;
    });
  },
};

