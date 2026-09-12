import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { products } from "./catalog";
import { users } from "./auth";

export const orderStatuses = [
  "PENDING_PAYMENT",
  "PAID",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
] as const;

export const paymentStatuses = ["PENDING", "SUCCESS", "FAILED"] as const;
export const paymentMethods = ["MOCK"] as const;

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
    quantity: int("quantity", { unsigned: true }).notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("cart_items_user_product_unique").on(
      table.userId,
      table.productId,
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
    productName: varchar("product_name", { length: 200 }).notNull(),
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
    check("order_items_quantity_check", sql`${table.quantity} > 0`),
  ],
);

export const payments = mysqlTable(
  "payments",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    paymentNo: varchar("payment_no", { length: 32 }).notNull(),
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
