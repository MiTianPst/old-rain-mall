import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { products, productVariants } from "./catalog";
import { users } from "./auth";

export const orderStatuses = [
  "PENDING_PAYMENT",
  "PAID",
  "SHIPPED",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
  "REFUNDED",
] as const;

export const paymentStatuses = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;
export const paymentMethods = ["MOCK"] as const;
export const inventoryTransactionTypes = [
  "INITIAL",
  "INBOUND",
  "SALE",
  "CANCEL_RESTORE",
  "REFUND_RESTORE",
  "ADJUSTMENT",
] as const;

export const cartItems = mysqlTable(
  "cart_items",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: int("product_id", { unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: int("variant_id", { unsigned: true })
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: int("quantity", { unsigned: true }).notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("cart_items_user_variant_unique").on(
      table.userId,
      table.variantId,
    ),
    index("cart_items_user_id_idx").on(table.userId),
    check("cart_items_quantity_check", sql`${table.quantity} > 0`),
  ],
);

export const orders = mysqlTable(
  "orders",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    orderNo: varchar("order_no", { length: 32 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: mysqlEnum("status", orderStatuses)
      .notNull()
      .default("PENDING_PAYMENT"),
    paymentStatus: mysqlEnum("payment_status", paymentStatuses)
      .notNull()
      .default("PENDING"),
    membershipLevelSnapshot: tinyint("membership_level_snapshot", {
      unsigned: true,
    })
      .notNull()
      .default(0),
    originalAmountCents: bigint("original_amount_cents", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    discountRateBps: int("discount_rate_bps", { unsigned: true })
      .notNull()
      .default(10000),
    memberDiscountCents: bigint("member_discount_cents", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .default(0),
    shippingFeeCents: int("shipping_fee_cents", { unsigned: true })
      .notNull()
      .default(0),
    adminNote: varchar("admin_note", { length: 1000 }),
    totalCents: bigint("total_cents", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    recipientName: varchar("recipient_name", { length: 100 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 32 }).notNull(),
    recipientAddress: varchar("recipient_address", { length: 500 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    paidAt: timestamp("paid_at"),
    cancelledAt: timestamp("cancelled_at"),
    shippedAt: timestamp("shipped_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("orders_order_no_unique").on(table.orderNo),
    index("orders_user_created_idx").on(table.userId, table.createdAt),
    index("orders_status_created_idx").on(table.status, table.createdAt),
    index("orders_expiration_idx").on(table.status, table.expiresAt),
    check(
      "orders_membership_level_check",
      sql`${table.membershipLevelSnapshot} between 0 and 3`,
    ),
    check(
      "orders_discount_rate_check",
      sql`${table.discountRateBps} between 0 and 10000`,
    ),
  ],
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    orderId: int("order_id", { unsigned: true })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: int("product_id", { unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: int("variant_id", { unsigned: true })
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    productName: varchar("product_name", { length: 200 }).notNull(),
    variantName: varchar("variant_name", { length: 200 }).notNull(),
    variantAttributesJson: text("variant_attributes_json").notNull(),
    productCoverUrl: varchar("product_cover_url", { length: 1000 }),
    unitPriceCents: int("unit_price_cents", { unsigned: true }).notNull(),
    quantity: int("quantity", { unsigned: true }).notNull(),
    subtotalCents: bigint("subtotal_cents", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_variant_id_idx").on(table.variantId),
    check("order_items_quantity_check", sql`${table.quantity} > 0`),
  ],
);

export const inventoryTransactions = mysqlTable(
  "inventory_transactions",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    variantId: int("variant_id", { unsigned: true })
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    type: mysqlEnum("type", inventoryTransactionTypes).notNull(),
    quantityDelta: int("quantity_delta").notNull(),
    stockBefore: int("stock_before", { unsigned: true }).notNull(),
    stockAfter: int("stock_after", { unsigned: true }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: varchar("reference_id", { length: 100 }),
    operatorUserId: varchar("operator_user_id", { length: 36 }).references(
      () => users.id,
      { onDelete: "restrict" },
    ),
    idempotencyKey: varchar("idempotency_key", { length: 160 }),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("inventory_transactions_variant_created_idx").on(
      table.variantId,
      table.createdAt,
    ),
    index("inventory_transactions_reference_idx").on(
      table.referenceType,
      table.referenceId,
    ),
    index("inventory_transactions_operator_idx").on(table.operatorUserId),
    uniqueIndex("inventory_transactions_idempotency_key_unique").on(table.idempotencyKey),
  ],
);

export const shipmentStatuses = ["PENDING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] as const;

export const shipments = mysqlTable(
  "shipments",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    orderId: int("order_id", { unsigned: true }).notNull().references(() => orders.id, { onDelete: "restrict" }),
    carrier: varchar("carrier", { length: 100 }).notNull(),
    trackingNo: varchar("tracking_no", { length: 100 }).notNull(),
    status: mysqlEnum("status", shipmentStatuses).notNull().default("PENDING"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("shipments_order_id_unique").on(table.orderId),
    index("shipments_status_updated_idx").on(table.status, table.updatedAt),
  ],
);

export const afterSaleStatuses = ["REQUESTED", "APPROVED", "REJECTED", "REFUNDING", "REFUNDED"] as const;

export const afterSales = mysqlTable(
  "after_sales",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    orderId: int("order_id", { unsigned: true }).notNull().references(() => orders.id, { onDelete: "restrict" }),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "restrict" }),
    reason: varchar("reason", { length: 100 }).notNull(),
    description: varchar("description", { length: 1000 }).notNull(),
    status: mysqlEnum("status", afterSaleStatuses).notNull().default("REQUESTED"),
    refundAmountCents: bigint("refund_amount_cents", { mode: "number", unsigned: true }).notNull(),
    reviewNote: varchar("review_note", { length: 1000 }),
    reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at"),
    refundedAt: timestamp("refunded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("after_sales_order_id_unique").on(table.orderId),
    index("after_sales_user_created_idx").on(table.userId, table.createdAt),
    index("after_sales_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const payments = mysqlTable(
  "payments",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    paymentNo: varchar("payment_no", { length: 32 }).notNull(),
    providerTradeNo: varchar("provider_trade_no", { length: 128 }),
    orderId: int("order_id", { unsigned: true })
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    method: mysqlEnum("method", paymentMethods).notNull().default("MOCK"),
    status: mysqlEnum("status", paymentStatuses)
      .notNull()
      .default("PENDING"),
    amountCents: bigint("amount_cents", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("payments_payment_no_unique").on(table.paymentNo),
    uniqueIndex("payments_provider_trade_no_unique").on(table.providerTradeNo),
    uniqueIndex("payments_order_id_unique").on(table.orderId),
    index("payments_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const membershipLevelLogs = mysqlTable(
  "membership_level_logs",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderId: int("order_id", { unsigned: true })
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    fromLevel: tinyint("from_level", { unsigned: true }).notNull(),
    toLevel: tinyint("to_level", { unsigned: true }).notNull(),
    lifetimePaidCents: bigint("lifetime_paid_cents", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_level_logs_order_unique").on(table.orderId),
    index("membership_level_logs_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    check(
      "membership_level_logs_from_level_check",
      sql`${table.fromLevel} between 0 and 3`,
    ),
    check(
      "membership_level_logs_to_level_check",
      sql`${table.toLevel} between 1 and 3`,
    ),
  ],
);
