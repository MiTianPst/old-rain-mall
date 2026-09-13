import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { cartItems, categories, products } from "@/db/schema";
import type { CartRepository } from "@/server/services/cart-service";

export const cartRepository: CartRepository = {
  addItem(input) {
    return db.transaction(async (transaction) => {
      const [product] = await transaction
        .select({ id: products.id, stock: products.stock })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.id, input.productId),
            eq(products.status, "ACTIVE"),
            eq(categories.status, "ACTIVE"),
          ),
        )
        .limit(1)
        .for("update");

      if (!product) return { status: "PRODUCT_UNAVAILABLE" as const };

      const [existingItem] = await transaction
        .select({ id: cartItems.id, quantity: cartItems.quantity })
        .from(cartItems)
        .where(
          and(
            eq(cartItems.userId, input.userId),
            eq(cartItems.productId, input.productId),
          ),
        )
        .limit(1)
        .for("update");

      const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;
      if (nextQuantity > product.stock) {
        return { status: "STOCK_EXCEEDED" as const, stock: product.stock };
      }

      if (existingItem) {
        await transaction
          .update(cartItems)
          .set({ quantity: nextQuantity })
          .where(eq(cartItems.id, existingItem.id));
      } else {
        await transaction.insert(cartItems).values({
          userId: input.userId,
          productId: input.productId,
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
          stock: products.stock,
          productStatus: products.status,
          categoryStatus: categories.status,
        })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
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

  listItems(userId) {
    return db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
        product: {
          id: products.id,
          slug: products.slug,
          name: products.name,
          priceCents: products.priceCents,
          stock: products.stock,
          coverUrl: products.coverUrl,
          status: products.status,
          categoryStatus: categories.status,
        },
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.updatedAt));
  },
};
