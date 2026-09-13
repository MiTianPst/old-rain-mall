import "server-only";

import { and, asc, eq, lte } from "drizzle-orm";

import { db } from "@/db";
import { inventoryTransactions, products, productVariants } from "@/db/schema";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import type { InventoryRepository } from "@/server/services/inventory-service";

export const inventoryRepository: InventoryRepository = {
  adjustStock(input) {
    return db.transaction(async (transaction) => {
      const [variant] = await transaction
        .select({ id: productVariants.id, stock: productVariants.stock })
        .from(productVariants)
        .where(eq(productVariants.id, input.variantId))
        .limit(1)
        .for("update");
      if (!variant) return { status: "NOT_FOUND" as const };
      const stockAfter = variant.stock + input.quantityDelta;
      if (stockAfter < 0) return { status: "INSUFFICIENT_STOCK" as const, stock: variant.stock };

      await transaction.update(productVariants).set({ stock: stockAfter }).where(eq(productVariants.id, variant.id));
      await transaction.insert(inventoryTransactions).values({
        variantId: variant.id,
        type: input.quantityDelta > 0 ? "INBOUND" : "ADJUSTMENT",
        quantityDelta: input.quantityDelta,
        stockBefore: variant.stock,
        stockAfter,
        referenceType: "ADMIN",
        referenceId: input.operatorUserId,
        operatorUserId: input.operatorUserId,
        note: input.note,
      });
      return { status: "ADJUSTED" as const, variantId: variant.id, stockBefore: variant.stock, stockAfter };
    });
  },
  async listLowStock() {
    return db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        skuCode: productVariants.skuCode,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(eq(productVariants.status, "ACTIVE"), lte(productVariants.stock, LOW_STOCK_THRESHOLD)))
      .orderBy(asc(productVariants.stock), asc(productVariants.updatedAt), asc(productVariants.id));
  },
};
