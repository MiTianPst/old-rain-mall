import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  membershipLevelLogs,
  inventoryTransactions,
  orderItems,
  orders,
  payments,
  productVariants,
  users,
} from "@/db/schema";
import { getMembershipLevel, type MembershipLevel } from "@/lib/membership";
import type {
  PaymentConfirmationResult,
  PaymentRepository,
} from "@/server/services/payment-service";

function isDuplicateEntry(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; errno?: unknown };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}

async function readFinalState(userId: string | undefined, orderNo: string): Promise<PaymentConfirmationResult> {
  const conditions = [eq(orders.orderNo, orderNo)];
  if (userId) conditions.push(eq(orders.userId, userId));
  const [row] = await db
    .select({
      orderStatus: orders.status,
      paymentStatus: payments.status,
      membershipLevel: users.membershipLevel,
    })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(and(...conditions))
    .limit(1);

  if (!row) return { status: "ORDER_NOT_FOUND" };
  if (row.orderStatus === "PAID" && row.paymentStatus === "SUCCESS") {
    return {
      status: "ALREADY_PAID",
      membershipLevel: row.membershipLevel as MembershipLevel,
    };
  }
  return { status: "INVALID_STATE" };
}

export const paymentRepository: PaymentRepository = {
  getPayableOrder(input) {
    return db.transaction(async (transaction) => {
      const [order] = await transaction
        .select({
          id: orders.id,
          userId: orders.userId,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          totalCents: orders.totalCents,
          expiresAt: orders.expiresAt,
        })
        .from(orders)
        .where(and(eq(orders.userId, input.userId), eq(orders.orderNo, input.orderNo)))
        .limit(1)
        .for("update");
      if (!order) return { status: "ORDER_NOT_FOUND" as const };

      const [payment] = await transaction
        .select({
          paymentNo: payments.paymentNo,
          status: payments.status,
          amountCents: payments.amountCents,
        })
        .from(payments)
        .where(eq(payments.orderId, order.id))
        .limit(1)
        .for("update");
      const [user] = await transaction
        .select({ membershipLevel: users.membershipLevel })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1)
        .for("update");
      if (!payment || !user) return { status: "INVALID_STATE" as const };

      if (order.status === "PAID" && payment.status === "SUCCESS") {
        return {
          status: "ALREADY_PAID" as const,
          membershipLevel: user.membershipLevel as MembershipLevel,
        };
      }
      if (order.status !== "PENDING_PAYMENT" || payment.status !== "PENDING") {
        return { status: "INVALID_STATE" as const };
      }
      if (order.expiresAt <= input.now) {
        const items = await transaction
          .select({ variantId: orderItems.variantId, quantity: orderItems.quantity, stock: productVariants.stock })
          .from(orderItems)
          .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
          .where(eq(orderItems.orderId, order.id))
          .orderBy(asc(orderItems.variantId))
          .for("update");
        for (const item of items) {
          await transaction
            .update(productVariants)
            .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
            .where(eq(productVariants.id, item.variantId));
          await transaction.insert(inventoryTransactions).values({
            variantId: item.variantId,
            type: "CANCEL_RESTORE",
            quantityDelta: item.quantity,
            stockBefore: item.stock,
            stockAfter: item.stock + item.quantity,
            referenceType: "ORDER",
            referenceId: input.orderNo,
            operatorUserId: input.userId,
            note: "订单超时恢复库存",
            createdAt: input.now,
          });
        }
        await transaction
          .update(orders)
          .set({ status: "CLOSED", paymentStatus: "FAILED", updatedAt: input.now })
          .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING_PAYMENT")));
        await transaction
          .update(payments)
          .set({ status: "FAILED", updatedAt: input.now })
          .where(and(eq(payments.orderId, order.id), eq(payments.status, "PENDING")));
        return { status: "ORDER_EXPIRED" as const };
      }

      return {
        status: "PAYABLE" as const,
        order: {
          orderNo: input.orderNo,
          paymentNo: payment.paymentNo,
          amountCents: payment.amountCents,
        },
      };
    });
  },

  async confirm(input) {
    try {
      return await db.transaction(async (transaction) => {
        const [order] = await transaction
          .select({
            id: orders.id,
            userId: orders.userId,
            status: orders.status,
            totalCents: orders.totalCents,
            expiresAt: orders.expiresAt,
          })
          .from(orders)
          .where(
            input.userId
              ? and(eq(orders.userId, input.userId), eq(orders.orderNo, input.orderNo))
              : eq(orders.orderNo, input.orderNo),
          )
          .limit(1)
          .for("update");
        if (!order) return { status: "ORDER_NOT_FOUND" as const };

        const [payment] = await transaction
          .select({
            paymentNo: payments.paymentNo,
            status: payments.status,
            amountCents: payments.amountCents,
          })
          .from(payments)
          .where(eq(payments.orderId, order.id))
          .limit(1)
          .for("update");
        const [user] = await transaction
          .select({ membershipLevel: users.membershipLevel, lifetimePaidCents: users.lifetimePaidCents })
          .from(users)
          .where(eq(users.id, order.userId))
          .limit(1)
          .for("update");
        if (!payment || !user) return { status: "INVALID_STATE" as const };

        if (order.status === "PAID" && payment.status === "SUCCESS") {
          return {
            status: "ALREADY_PAID" as const,
            membershipLevel: user.membershipLevel as MembershipLevel,
          };
        }
        if (order.status !== "PENDING_PAYMENT" || payment.status !== "PENDING") {
          return { status: "INVALID_STATE" as const };
        }
        if (order.expiresAt <= input.now) {
          const items = await transaction
            .select({ variantId: orderItems.variantId, quantity: orderItems.quantity, stock: productVariants.stock })
            .from(orderItems)
            .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
            .where(eq(orderItems.orderId, order.id))
            .orderBy(asc(orderItems.variantId))
            .for("update");
          for (const item of items) {
            await transaction
              .update(productVariants)
              .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
              .where(eq(productVariants.id, item.variantId));
            await transaction.insert(inventoryTransactions).values({
              variantId: item.variantId,
              type: "CANCEL_RESTORE",
              quantityDelta: item.quantity,
              stockBefore: item.stock,
              stockAfter: item.stock + item.quantity,
              referenceType: "ORDER",
              referenceId: input.orderNo,
              operatorUserId: order.userId,
              note: "订单超时恢复库存",
              createdAt: input.now,
            });
          }
          await transaction
            .update(orders)
            .set({ status: "CLOSED", paymentStatus: "FAILED", updatedAt: input.now })
            .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING_PAYMENT")));
          await transaction
            .update(payments)
            .set({ status: "FAILED", updatedAt: input.now })
            .where(and(eq(payments.orderId, order.id), eq(payments.status, "PENDING")));
          return { status: "ORDER_EXPIRED" as const };
        }
        if (
          input.providerResult.status !== "SUCCESS" ||
          (input.providerResult.paymentNo !== undefined && input.providerResult.paymentNo !== payment.paymentNo) ||
          (input.providerResult.orderNo !== undefined && input.providerResult.orderNo !== input.orderNo)
        ) {
          return { status: "INVALID_STATE" as const };
        }
        if (
          input.providerResult.amountCents !== payment.amountCents ||
          input.providerResult.amountCents !== order.totalCents
        ) {
          return { status: "AMOUNT_MISMATCH" as const };
        }

        const currentLevel = user.membershipLevel as MembershipLevel;
        const nextLifetimePaidCents = user.lifetimePaidCents + order.totalCents;
        const nextLevel = getMembershipLevel(nextLifetimePaidCents);

        await transaction
          .update(payments)
          .set({
            status: "SUCCESS",
            providerTradeNo: input.providerResult.providerTradeNo,
            paidAt: input.now,
            updatedAt: input.now,
          })
          .where(and(eq(payments.orderId, order.id), eq(payments.status, "PENDING")));
        await transaction
          .update(orders)
          .set({ status: "PAID", paymentStatus: "SUCCESS", paidAt: input.now, updatedAt: input.now })
          .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING_PAYMENT")));
        await transaction
          .update(users)
          .set({
            lifetimePaidCents: nextLifetimePaidCents,
            membershipLevel: nextLevel,
            membershipUpgradedAt: nextLevel > currentLevel ? input.now : undefined,
            updatedAt: input.now,
          })
          .where(eq(users.id, order.userId));
        if (nextLevel > currentLevel) {
          await transaction.insert(membershipLevelLogs).values({
            userId: order.userId,
            orderId: order.id,
            fromLevel: currentLevel,
            toLevel: nextLevel,
            lifetimePaidCents: nextLifetimePaidCents,
            createdAt: input.now,
          });
        }

        return { status: "PAID" as const, membershipLevel: nextLevel };
      });
    } catch (error) {
      if (isDuplicateEntry(error)) return readFinalState(input.userId, input.orderNo);
      throw error;
    }
  },
};
