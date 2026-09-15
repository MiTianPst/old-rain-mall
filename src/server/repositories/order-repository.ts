import "server-only";

import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cartItems,
  categories,
  inventoryTransactions,
  orderItems,
  orders,
  payments,
  products,
  productVariants,
  shipments,
  afterSales,
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
  shippedAt: orders.shippedAt,
  completedAt: orders.completedAt,
};

async function loadOrderItems(orderIds: number[]) {
  if (orderIds.length === 0) return new Map<number, OrderRecord["items"]>();

  const rows = await db
    .select({
      orderId: orderItems.orderId,
      id: orderItems.id,
      productId: orderItems.productId,
      variantId: orderItems.variantId,
      productName: orderItems.productName,
      variantName: orderItems.variantName,
      variantAttributesJson: orderItems.variantAttributesJson,
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
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      productName: row.productName,
      variantName: row.variantName,
      variantAttributesJson: row.variantAttributesJson,
      productCoverUrl: row.productCoverUrl,
      unitPriceCents: row.unitPriceCents,
      quantity: row.quantity,
      subtotalCents: row.subtotalCents,
    });
    grouped.set(row.orderId, items);
  }
  return grouped;
}

async function loadShipments(orderIds: number[]) {
  if (orderIds.length === 0) return new Map<number, OrderRecord["shipment"]>();
  const rows = await db
    .select({ orderId: shipments.orderId, shipment: shipments })
    .from(shipments)
    .where(inArray(shipments.orderId, orderIds));
  return new Map(rows.map((row) => [row.orderId, {
    id: row.shipment.id,
    orderId: row.shipment.orderId,
    carrier: row.shipment.carrier,
    trackingNo: row.shipment.trackingNo,
    status: row.shipment.status,
    shippedAt: row.shipment.shippedAt,
    deliveredAt: row.shipment.deliveredAt,
    updatedAt: row.shipment.updatedAt,
  }]));
}

async function loadAfterSales(orderIds: number[]) {
  if (orderIds.length === 0) return new Map<number, OrderRecord["afterSale"]>();
  const rows = await db
    .select({ orderId: afterSales.orderId, orderNo: orders.orderNo, sale: afterSales })
    .from(afterSales)
    .innerJoin(orders, eq(orders.id, afterSales.orderId))
    .where(inArray(afterSales.orderId, orderIds));
  return new Map(rows.map((row) => [row.orderId, {
    id: row.sale.id,
    orderId: row.sale.orderId,
    orderNo: row.orderNo,
    userId: row.sale.userId,
    reason: row.sale.reason,
    description: row.sale.description,
    status: row.sale.status,
    refundAmountCents: row.sale.refundAmountCents,
    reviewNote: row.sale.reviewNote,
    reviewedBy: row.sale.reviewedBy,
    reviewedAt: row.sale.reviewedAt,
    refundedAt: row.sale.refundedAt,
    createdAt: row.sale.createdAt,
    updatedAt: row.sale.updatedAt,
  }]));
}

type CreateOrderLine = {
  cartItemId: number | null;
  productId: number;
  variantId: number;
  quantity: number;
  productName: string;
  variantName: string;
  variantAttributesJson: string;
  productCoverUrl: string | null;
  unitPriceCents: number;
  stock: number;
  variantStatus: "ACTIVE" | "ARCHIVED";
  productStatus: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryStatus: "ACTIVE" | "HIDDEN";
};

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

    let items: CreateOrderLine[];
    if (input.buyNowVariantId !== undefined) {
      const rows = await transaction
        .select({
          productId: products.id,
          variantId: productVariants.id,
          productName: products.name,
          variantName: productVariants.name,
          variantAttributesJson: productVariants.attributesJson,
          productCoverUrl: products.coverUrl,
          unitPriceCents: productVariants.priceCents,
          stock: productVariants.stock,
          variantStatus: productVariants.status,
          productStatus: products.status,
          categoryStatus: categories.status,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(productVariants.id, input.buyNowVariantId),
            eq(productVariants.status, "ACTIVE"),
            eq(products.status, "ACTIVE"),
            eq(categories.status, "ACTIVE"),
          ),
        )
        .limit(1)
        .for("update");
      items = rows.map((row) => ({ ...row, cartItemId: null, quantity: 1 }));
    } else {
      const rows = await transaction
        .select({
          cartItemId: cartItems.id,
          productId: products.id,
          variantId: productVariants.id,
          quantity: cartItems.quantity,
          productName: products.name,
          variantName: productVariants.name,
          variantAttributesJson: productVariants.attributesJson,
          productCoverUrl: products.coverUrl,
          unitPriceCents: productVariants.priceCents,
          stock: productVariants.stock,
          variantStatus: productVariants.status,
          productStatus: products.status,
          categoryStatus: categories.status,
        })
        .from(cartItems)
        .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
        .innerJoin(products, eq(productVariants.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(cartItems.userId, input.userId))
        .orderBy(asc(productVariants.id))
        .for("update");
      items = rows;
    }

    if (items.length === 0) {
      throw new OrderTransactionError(
        input.buyNowVariantId !== undefined
          ? { status: "PRODUCT_UNAVAILABLE", productName: "当前商品" }
          : { status: "EMPTY_CART" },
      );
    }

    for (const item of items) {
      if (item.variantStatus !== "ACTIVE" || item.productStatus !== "ACTIVE" || item.categoryStatus !== "ACTIVE") {
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
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
        .where(
          and(
            eq(productVariants.id, item.variantId),
            eq(productVariants.status, "ACTIVE"),
            gte(productVariants.stock, item.quantity),
          ),
        );
      if (result[0].affectedRows !== 1) {
        throw new OrderTransactionError({
          status: "STOCK_EXCEEDED",
          productName: item.productName,
          stock: item.stock,
        });
      }
      await transaction.insert(inventoryTransactions).values({
        variantId: item.variantId,
        type: "SALE",
        quantityDelta: -item.quantity,
        stockBefore: item.stock,
        stockAfter: item.stock - item.quantity,
        referenceType: "ORDER",
        referenceId: input.orderNo,
        operatorUserId: input.userId,
        note: "订单销售出库",
        createdAt: input.now,
      });
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
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        variantAttributesJson: item.variantAttributesJson,
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
    const cartItemIds = items
      .map((item) => item.cartItemId)
      .filter((cartItemId): cartItemId is number => cartItemId !== null);
    if (cartItemIds.length > 0) {
      await transaction
        .delete(cartItems)
        .where(and(eq(cartItems.userId, input.userId), inArray(cartItems.id, cartItemIds)));
    }

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
      .select({ id: orders.id, orderNo: orders.orderNo, userId: orders.userId, status: orders.status, expiresAt: orders.expiresAt })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .for("update");

    if (!order || order.status !== "PENDING_PAYMENT") return false;
    if (input.status === "CLOSED" && order.expiresAt > input.now) return false;

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
        referenceId: order.orderNo,
        operatorUserId: order.userId,
        note: input.status === "CANCELLED" ? "订单取消恢复库存" : "订单超时恢复库存",
        createdAt: input.now,
      });
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
  async getCheckout(userId, buyNowVariantId) {
    const [user] = await db
      .select({ membershipLevel: users.membershipLevel })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const addressesPromise = db
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
      .orderBy(desc(userAddresses.isDefault), desc(userAddresses.updatedAt));

    const [addresses, items] = await Promise.all([
      addressesPromise,
      buyNowVariantId !== undefined
        ? db
            .select({
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
            .from(productVariants)
            .innerJoin(products, eq(productVariants.productId, products.id))
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .where(
              and(
                eq(productVariants.id, buyNowVariantId),
                eq(productVariants.status, "ACTIVE"),
                eq(products.status, "ACTIVE"),
                eq(categories.status, "ACTIVE"),
              ),
            )
            .limit(1)
            .then((rows) =>
              rows.map(({ product }) => ({
                id: 0,
                quantity: 1,
                product,
              })),
            )
        : db
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
            .orderBy(desc(cartItems.updatedAt)),
    ]);

    return {
      user: { membershipLevel: (user?.membershipLevel ?? 0) as MembershipLevel },
      addresses: addresses.map((address) => ({
        ...address,
        label: address.label ?? undefined,
      })),
      items: items.map(({ product, ...item }) => ({
        ...item,
        product: {
          ...product,
          variantAttributes: parseVariantAttributes(product.variantAttributesJson),
        },
      })),
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
    const ids = rows.map((row) => row.id);
    const [items, shipmentMap, afterSaleMap] = await Promise.all([
      loadOrderItems(ids),
      loadShipments(ids),
      loadAfterSales(ids),
    ]);
    return rows.map((row) => ({
      ...row,
      membershipLevelSnapshot: row.membershipLevelSnapshot as MembershipLevel,
      items: items.get(row.id) ?? [],
      shipment: shipmentMap.get(row.id) ?? null,
      afterSale: afterSaleMap.get(row.id) ?? null,
    }));
  },

  async getByOrderNo(input) {
    const [row] = await db
      .select(orderSelection)
      .from(orders)
      .where(and(eq(orders.orderNo, input.orderNo), eq(orders.userId, input.userId)))
      .limit(1);
    if (!row) return null;
    const [items, shipmentMap, afterSaleMap] = await Promise.all([
      loadOrderItems([row.id]),
      loadShipments([row.id]),
      loadAfterSales([row.id]),
    ]);
    return {
      ...row,
      membershipLevelSnapshot: row.membershipLevelSnapshot as MembershipLevel,
      items: items.get(row.id) ?? [],
      shipment: shipmentMap.get(row.id) ?? null,
      afterSale: afterSaleMap.get(row.id) ?? null,
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
          note: order.expiresAt <= input.now ? "订单超时恢复库存" : "订单取消恢复库存",
          createdAt: input.now,
        });
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
