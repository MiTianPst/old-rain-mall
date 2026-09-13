import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { cartItems, categories, products, productVariants } from "@/db/schema";
import type { CartRepository } from "@/server/services/cart-service";

export const cartRepository: CartRepository = {
  addItem(input) {
    return db.transaction(async (transaction) => {
      const [variant] = await transaction
        .select({ id: productVariants.id, productId: products.id, stock: productVariants.stock })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(productVariants.id, input.variantId),
            eq(productVariants.status, "ACTIVE"),
            eq(products.status, "ACTIVE"),
            eq(categories.status, "ACTIVE"),
          ),
        )
        .limit(1)
        .for("update");

      if (!variant) return { status: "PRODUCT_UNAVAILABLE" as const };

      const [existingItem] = await transaction
        .select({ id: cartItems.id, quantity: cartItems.quantity })
        .from(cartItems)
        .where(
          and(
            eq(cartItems.userId, input.userId),
            eq(cartItems.variantId, input.variantId),
          ),
        )
        .limit(1)
        .for("update");

      const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;
      if (nextQuantity > variant.stock) {
        return { status: "STOCK_EXCEEDED" as const, stock: variant.stock };
      }

      if (existingItem) {
        await transaction
          .update(cartItems)
          .set({ quantity: nextQuantity })
          .where(eq(cartItems.id, existingItem.id));
      } else {
        await transaction.insert(cartItems).values({
          userId: input.userId,
          productId: variant.productId,
          variantId: variant.id,
          quantity: nextQuantity,
        });
      }

      return { status: "ADDED" as const, quantity: nextQuantity };
    });
  },

  updateItem(input) {
    return db.transaction(async (transaction) => {
      const [item] = await transaction
        .select({
          id: cartItems.id,
          stock: productVariants.stock,
          variantStatus: productVariants.status,
          productStatus: products.status,
          categoryStatus: categories.status,
        })
        .from(cartItems)
        .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
        .innerJoin(products, eq(productVariants.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(cartItems.id, input.cartItemId),
            eq(cartItems.userId, input.userId),
          ),
        )
        .limit(1)
        .for("update");

      if (!item) return { status: "ITEM_NOT_FOUND" as const };

      if (
        item.variantStatus !== "ACTIVE" ||
        item.productStatus !== "ACTIVE" ||
        item.categoryStatus !== "ACTIVE"
      ) {
        return { status: "PRODUCT_UNAVAILABLE" as const };
      }

      if (input.quantity > item.stock) {
        return { status: "STOCK_EXCEEDED" as const, stock: item.stock };
      }

      await transaction
        .update(cartItems)
        .set({ quantity: input.quantity })
        .where(
          and(
            eq(cartItems.id, input.cartItemId),
            eq(cartItems.userId, input.userId),
          ),
        );

      return { status: "UPDATED" as const, quantity: input.quantity };
    });
  },

  async removeItem(input) {
    const result = await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.id, input.cartItemId),
          eq(cartItems.userId, input.userId),
        ),
      );

    return result[0].affectedRows > 0;
  },

  async listItems(userId) {
    const rows = await db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
        product: {
          id: products.id,
          variantId: productVariants.id,
          slug: products.slug,
          name: products.name,
          variantName: productVariants.name,
          variantAttributesJson: productVariants.attributesJson,
          priceCents: productVariants.priceCents,
          stock: productVariants.stock,
          coverUrl: products.coverUrl,
          status: products.status,
          variantStatus: productVariants.status,
          categoryStatus: categories.status,
        },
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.updatedAt));
    return rows.map(({ product, ...row }) => ({
      ...row,
      product: {
        ...product,
        variantAttributes: parseVariantAttributes(product.variantAttributesJson),
      },
    }));
  },
};

function parseVariantAttributes(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}
