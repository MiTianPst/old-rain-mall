import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const categoryStatuses = ["ACTIVE", "HIDDEN"] as const;
export const productStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export const categories = mysqlTable(
  "categories",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: varchar("description", { length: 500 }),
    sortOrder: int("sort_order", { unsigned: true }).notNull().default(0),
    status: mysqlEnum("status", categoryStatuses)
      .notNull()
      .default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_status_sort_idx").on(table.status, table.sortOrder),
  ],
);

export const products = mysqlTable(
  "products",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    categoryId: int("category_id", { unsigned: true })
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    summary: varchar("summary", { length: 500 }),
    description: text("description"),
    priceCents: int("price_cents", { unsigned: true }).notNull(),
    stock: int("stock", { unsigned: true }).notNull().default(0),
    status: mysqlEnum("status", productStatuses).notNull().default("DRAFT"),
    coverUrl: varchar("cover_url", { length: 1000 }),
    version: int("version", { unsigned: true }).notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_status_idx").on(
      table.categoryId,
      table.status,
    ),
    index("products_status_created_idx").on(table.status, table.createdAt),
    index("products_name_idx").on(table.name),
  ],
);

export const productImages = mysqlTable(
  "product_images",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    productId: int("product_id", { unsigned: true })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 1000 }).notNull(),
    altText: varchar("alt_text", { length: 255 }),
    sortOrder: int("sort_order", { unsigned: true }).notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("product_images_product_sort_idx").on(table.productId, table.sortOrder)],
);
