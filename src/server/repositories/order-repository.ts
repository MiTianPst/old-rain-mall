import "server-only";

import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cartItems,
  categories,
  orderItems,
  orders,
  payments,
  products,
  userAddresses,
  users,
} from "@/db/schema";
import { calculateOrderPricing } from "@/features/order/pricing";
import type { MembershipLevel } from "@/lib/membership";
import type {
  OrderCreateResult,
  OrderRecord,
  OrderRepository,
} from "@/server/services/order-service";

class OrderTransactionError extends Error {
  constructor(readonly result: Exclude<OrderCreateResult, { status: "CREATED" }>) {
    super(result.status);
  }
}

function isDuplicateEntry(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; errno?: unknown };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}

const orderSelection = {
  id: orders.id,
  orderNo: orders.orderNo,
  userId: orders.userId,
  status: orders.status,
  paymentStatus: orders.paymentStatus,
  membershipLevelSnapshot: orders.membershipLevelSnapshot,
  originalAmountCents: orders.originalAmountCents,
  discountRateBps: orders.discountRateBps,
  memberDiscountCents: orders.memberDiscountCents,
  shippingFeeCents: orders.shippingFeeCents,
  totalCents: orders.totalCents,
  createdAt: orders.createdAt,
  expiresAt: orders.expiresAt,
  recipientName: orders.recipientName,
  recipientPhone: orders.recipientPhone,
  recipientAddress: orders.recipientAddress,
  paidAt: orders.paidAt,
  cancelledAt: orders.cancelledAt,
};

async function loadOrderItems(orderIds: number[]) {
  if (orderIds.length === 0) return new Map<number, OrderRecord["items"]>();

  const rows = await db
    .select({
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: orderItems.productName,
      productCoverUrl: orderItems.productCoverUrl,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      subtotalCents: orderItems.subtotalCents,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.id));

  const grouped = new Map<number, OrderRecord["items"]>();
  for (const row of rows) {
    const items = grouped.get(row.orderId) ?? [];
    items.push({
      productId: row.productId,
      productName: row.productName,
      productCoverUrl: row.productCoverUrl,
      unitPriceCents: row.unitPriceCents,
      quantity: row.quantity,
      subtotalCents: row.subtotalCents,
    });
    grouped.set(row.orderId, items);
  }
  return grouped;
}

async function createOrderTransaction(input: Parameters<OrderRepository["create"]>[0]) {
  return db.transaction(async (transaction) => {
    const [user] = await transaction
      .select({ id: users.id, membershipLevel: users.membershipLevel })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)
      .for("update");
    if (!user) throw new OrderTransactionError({ status: "USER_NOT_FOUND" });

    const [address] = await transaction
      .select({
        recipientName: userAddresses.recipientName,
        recipientPhone: userAddresses.recipientPhone,
        province: userAddresses.province,
        city: userAddresses.city,
        district: userAddresses.district,
        detailAddress: userAddresses.detailAddress,
      })
      .from(userAddresses)
      .where(
        and(
          eq(userAddresses.id, input.addressId),
          eq(userAddresses.userId, input.userId),
        ),
      )
      .limit(1)
      .for("update");
    if (!address) throw new OrderTransactionError({ status: "ADDRESS_NOT_FOUND" });

    const items = await transaction
      .select({
        cartItemId: cartItems.id,
        productId: products.id,
        quantity: cartItems.quantity,
        productName: products.name,
        productCoverUrl: products.coverUrl,
        unitPriceCents: products.priceCents,
        stock: products.stock,
        productStatus: products.status,
        categoryStatus: categories.status,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(cartItems.userId, input.userId))
      .orderBy(asc(products.id))
      .for("update");

    if (items.length === 0) throw new OrderTransactionError({ status: "EMPTY_CART" });

    for (const item of items) {
      if (item.productStatus !== "ACTIVE" || item.categoryStatus !== "ACTIVE") {
        throw new OrderTransactionError({
          status: "PRODUCT_UNAVAILABLE",
          productName: item.productName,
        });
      }
      if (item.stock < item.quantity) {
        throw new OrderTransactionError({
          status: "STOCK_EXCEEDED",
          productName: item.productName,
          stock: item.stock,
        });
      }
    }

    const originalAmountCents = items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
    const membershipLevel = user.membershipLevel as MembershipLevel;
    const pricing = calculateOrderPricing({ originalAmountCents, membershipLevel });

    for (const item of items) {
      const result = await transaction
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(
          and(
            eq(products.id, item.productId),
            eq(products.status, "ACTIVE"),
            gte(products.stock, item.quantity),
          ),
        );
      if (result[0].affectedRows !== 1) {
        throw new OrderTransactionError({
          status: "STOCK_EXCEEDED",
          productName: item.productName,
          stock: item.stock,
        });
      }
    }

    const recipientAddress = [
      address.province,
      address.city,
      address.district,
      address.detailAddress,
    ].join(" ");
    const insertOrderResult = await transaction.insert(orders).values({
      orderNo: input.orderNo,
      userId: input.userId,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      membershipLevelSnapshot: membershipLevel,
      originalAmountCents,
      discountRateBps: pricing.discountRateBps,
      memberDiscountCents: pricing.memberDiscountCents,
      shippingFeeCents: pricing.shippingFeeCents,
      totalCents: pricing.totalCents,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      recipientAddress,
      expiresAt: input.expiresAt,
      createdAt: input.now,
      updatedAt: input.now,
    });
    const orderId = insertOrderResult[0].insertId;

    await transaction.insert(orderItems).values(
      items.map((item) => ({
        orderId,
        productId: item.productId,
        productName: item.productName,
        productCoverUrl: item.productCoverUrl,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        subtotalCents: item.unitPriceCents * item.quantity,
        createdAt: input.now,
      })),
    );
    await transaction.insert(payments).values({
      paymentNo: input.paymentNo,
      orderId,
      method: "MOCK",
      status: "PENDING",
      amountCents: pricing.totalCents,
      createdAt: input.now,
      updatedAt: input.now,
    });
    await transaction
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.userId, input.userId),
          inArray(
            cartItems.id,
            items.map((item) => item.cartItemId),
          ),
        ),
      );

    return { status: "CREATED" as const, orderNo: input.orderNo };
  });
}

async function closePendingOrder(input: {
  orderId: number;
  now: Date;
  status: "CANCELLED" | "CLOSED";
}) {
  return db.transaction(async (transaction) => {
    const [order] = await transaction
      .select({ id: orders.id, status: orders.status, expiresAt: orders.expiresAt })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .for("update");

    if (!order || order.status !== "PENDING_PAYMENT") return false;
    if (input.status === "CLOSED" && order.expiresAt > input.now) return false;

    const items = await transaction
      .select({ productId: orderItems.productId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .orderBy(asc(orderItems.productId))
      .for("update");

    for (const item of items) {
      await transaction
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

    await transaction
      .update(orders)
      .set({
        status: input.status,
        paymentStatus: "FAILED",
        cancelledAt: input.status === "CANCELLED" ? input.now : null,
        updatedAt: input.now,
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING_PAYMENT")));
    await transaction
      .update(payments)
      .set({ status: "FAILED", updatedAt: input.now })
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "PENDING")));

    return true;
  });
}

export const orderRepository: OrderRepository = {
  async getCheckout(userId) {
    const [user] = await db
      .select({ membershipLevel: users.membershipLevel })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const [addresses, items] = await Promise.all([
      db
        .select({
          id: userAddresses.id,
          userId: userAddresses.userId,
          recipientName: userAddresses.recipientName,
          recipientPhone: userAddresses.recipientPhone,
          province: userAddresses.province,
          city: userAddresses.city,
          district: userAddresses.district,
          detailAddress: userAddresses.detailAddress,
          label: userAddresses.label,
          isDefault: userAddresses.isDefault,
        })
        .from(userAddresses)
        .where(eq(userAddresses.userId, userId))
        .orderBy(desc(userAddresses.isDefault), desc(userAddresses.updatedAt)),
      db
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
        .orderBy(desc(cartItems.updatedAt)),
    ]);

    return {
      user: { membershipLevel: (user?.membershipLevel ?? 0) as MembershipLevel },
      addresses: addresses.map((address) => ({
        ...address,
        label: address.label ?? undefined,
      })),
      items,
    };
  },

  async create(input) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await createOrderTransaction(input);
      } catch (error) {
        if (error instanceof OrderTransactionError) return error.result;
        if (!isDuplicateEntry(error) || attempt === 2) throw error;
      }
    }
    throw new Error("订单创建重试次数已耗尽");
  },

  async listByUser(userId) {
    const rows = await db
      .select(orderSelection)
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt), desc(orders.id));
    const items = await loadOrderItems(rows.map((row) => row.id));
    return rows.map((row) => ({
      ...row,
      membershipLevelSnapshot: row.membershipLevelSnapshot as MembershipLevel,
      items: items.get(row.id) ?? [],
    }));
  },

  async getByOrderNo(input) {
    const [row] = await db
      .select(orderSelection)
      .from(orders)
      .where(and(eq(orders.orderNo, input.orderNo), eq(orders.userId, input.userId)))
      .limit(1);
    if (!row) return null;
    const items = await loadOrderItems([row.id]);
    return {
      ...row,
      membershipLevelSnapshot: row.membershipLevelSnapshot as MembershipLevel,
      items: items.get(row.id) ?? [],
    };
  },

  async cancel(input) {
    const outcome = await db.transaction(async (transaction) => {
      const [order] = await transaction
        .select({ id: orders.id, status: orders.status, expiresAt: orders.expiresAt })
        .from(orders)
        .where(and(eq(orders.orderNo, input.orderNo), eq(orders.userId, input.userId)))
        .limit(1)
        .for("update");

      if (!order) return { status: "NOT_FOUND" as const };
      if (order.status !== "PENDING_PAYMENT") {
        return { status: "NOT_CANCELLABLE" as const };
      }

      const items = await transaction
        .select({ productId: orderItems.productId, quantity: orderItems.quantity })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))
        .orderBy(asc(orderItems.productId))
        .for("update");
      for (const item of items) {
        await transaction
          .update(products)
          .set({ stock: sql`${products.stock} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      const expired = order.expiresAt <= input.now;
      await transaction
        .update(orders)
        .set({
          status: expired ? "CLOSED" : "CANCELLED",
          paymentStatus: "FAILED",
          cancelledAt: expired ? null : input.now,
          updatedAt: input.now,
        })
        .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING_PAYMENT")));
      await transaction
        .update(payments)
        .set({ status: "FAILED", updatedAt: input.now })
        .where(and(eq(payments.orderId, order.id), eq(payments.status, "PENDING")));

      return { status: expired ? ("EXPIRED" as const) : ("CANCELLED" as const) };
    });
    return outcome;
  },

  async closeExpiredForUser(input) {
    const rows = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, input.userId),
          eq(orders.status, "PENDING_PAYMENT"),
          lte(orders.expiresAt, input.now),
        ),
      )
      .orderBy(asc(orders.id));
    let closedCount = 0;
    for (const row of rows) {
      if (await closePendingOrder({ orderId: row.id, now: input.now, status: "CLOSED" })) {
        closedCount += 1;
      }
    }
    return closedCount;
  },

  async closeExpiredBatch(input) {
    const safeLimit = Math.max(1, Math.min(100, input.limit));
    const rows = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, "PENDING_PAYMENT"), lte(orders.expiresAt, input.now)))
      .orderBy(asc(orders.expiresAt), asc(orders.id))
      .limit(safeLimit);
    let closedCount = 0;
    for (const row of rows) {
      if (await closePendingOrder({ orderId: row.id, now: input.now, status: "CLOSED" })) {
        closedCount += 1;
      }
    }
    return closedCount;
  },
};
