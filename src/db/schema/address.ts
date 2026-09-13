import {
  boolean,
  index,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";

export const userAddresses = mysqlTable(
  "user_addresses",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientName: varchar("recipient_name", { length: 100 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 32 }).notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }).notNull(),
    detailAddress: varchar("detail_address", { length: 500 }).notNull(),
    label: varchar("label", { length: 50 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("user_addresses_user_id_idx").on(table.userId),
    index("user_addresses_user_default_idx").on(table.userId, table.isDefault),
  ],
);
