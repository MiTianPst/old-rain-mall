import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  orderItems,
  orders,
  productReviews,
  products,
  users,
} from "@/db/schema";
import type {
  ReviewRepository,
  ReviewStatus,
} from "@/server/services/review-service";

const reviewSelection = {
  id: productReviews.id,
  orderItemId: productReviews.orderItemId,
  productId: productReviews.productId,
  rating: productReviews.rating,
  content: productReviews.content,
  status: productReviews.status,
  reviewNote: productReviews.reviewNote,
  createdAt: productReviews.createdAt,
};

export const reviewRepository: ReviewRepository = {
  async createReview({ userId, productId, orderItemId, rating, content, status, now }) {
    return db.transaction(async (transaction) => {
      const [eligibleItem] = await transaction
        .select({
          orderStatus: orders.status,
          paymentStatus: orders.paymentStatus,
          productId: orderItems.productId,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.id, orderItemId),
            eq(orderItems.productId, productId),
            eq(orders.userId, userId),
          ),
        )
        .limit(1)
        .for("update");

      if (
        !eligibleItem ||
        eligibleItem.paymentStatus !== "SUCCESS" ||
        !["DELIVERED", "COMPLETED"].includes(eligibleItem.orderStatus)
      ) {
        return { status: "NOT_ELIGIBLE" as const };
      }

      const [existing] = await transaction
        .select({ id: productReviews.id })
        .from(productReviews)
        .where(
          and(
            eq(productReviews.userId, userId),
            eq(productReviews.productId, productId),
          ),
        )
        .limit(1)
        .for("update");
      if (existing) return { status: "ALREADY_REVIEWED" as const };

      const inserted = await transaction
        .insert(productReviews)
        .values({
          userId,
          productId,
          orderItemId,
          rating,
          content,
          status,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      return { status: "CREATED" as const, id: inserted[0]?.id ?? 0 };
    });
  },

  async listPublic(productId) {
    return db
      .select({
        id: productReviews.id,
        rating: productReviews.rating,
        content: productReviews.content,
        userName: users.name,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .innerJoin(users, eq(productReviews.userId, users.id))
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.status, "APPROVED"),
        ),
      )
      .orderBy(desc(productReviews.createdAt), desc(productReviews.id));
  },

  async listByOrder(userId, orderNo) {
    return db
      .select(reviewSelection)
      .from(productReviews)
      .innerJoin(orderItems, eq(productReviews.orderItemId, orderItems.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.userId, userId), eq(orders.orderNo, orderNo)))
      .orderBy(asc(productReviews.id));
  },

  async listAdmin({ status, page, pageSize }) {
    const where = status ? eq(productReviews.status, status) : undefined;
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          ...reviewSelection,
          userId: productReviews.userId,
          userName: users.name,
          userEmail: users.email,
          productName: products.name,
          orderNo: orders.orderNo,
        })
        .from(productReviews)
        .innerJoin(users, eq(productReviews.userId, users.id))
        .innerJoin(products, eq(productReviews.productId, products.id))
        .innerJoin(orderItems, eq(productReviews.orderItemId, orderItems.id))
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(where)
        .orderBy(asc(productReviews.status), desc(productReviews.createdAt), desc(productReviews.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count(productReviews.id) }).from(productReviews).where(where),
    ]);

    return { items: rows, total: totalRow?.value ?? 0 };
  },

  async deleteReview(reviewId) {
    const result = await db
      .delete(productReviews)
      .where(eq(productReviews.id, reviewId));
    return result[0].affectedRows > 0
      ? { status: "DELETED" as const }
      : { status: "NOT_FOUND" as const };
  },
};

export function isPublicReviewStatus(status: ReviewStatus) {
  return status === "APPROVED";
}
