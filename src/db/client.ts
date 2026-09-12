import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { env } from "@/lib/env";

import * as schema from "./schema";

const globalForDatabase = globalThis as typeof globalThis & {
  oldRainMysqlPool?: mysql.Pool;
};

const pool =
  globalForDatabase.oldRainMysqlPool ??
  mysql.createPool({
    uri: env.DATABASE_URL,
    connectionLimit: 10,
    enableKeepAlive: true,
    waitForConnections: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.oldRainMysqlPool = pool;
}

export const db = drizzle({ client: pool, schema, mode: "default" });
export { pool };
