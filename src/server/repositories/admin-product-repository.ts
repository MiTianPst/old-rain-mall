import "server-only";

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import type { AdminProductRepository, ProductMutationResult } from "@/server/services/admin-product-service";

function isDuplicateEntry(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; errno?: unknown };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}

const selection = {
  id: products.id, categoryId: products.categoryId, categoryName: categories.name,
  name: products.name, slug: products.slug, summary: products.summary,
  description: products.description, priceCents: products.priceCents, stock: products.stock,
  status: products.status, coverUrl: products.coverUrl, version: products.version,
  createdAt: products.createdAt, updatedAt: products.updatedAt,
};

function normalize<T extends { summary: string | null; description: string | null; coverUrl: string | null }>(row: T) {
  return { ...row, summary: row.summary ?? undefined, description: row.description ?? undefined, coverUrl: row.coverUrl ?? undefined };
}

export const adminProductRepository: AdminProductRepository = {
  async list(input) {
    const conditions = [];
    if (input.search) conditions.push(or(like(products.name, `%${input.search}%`), like(products.slug, `%${input.search}%`))!);
    if (input.status) conditions.push(eq(products.status, input.status));
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [total]] = await Promise.all([
      db.select(selection).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).where(where).orderBy(desc(products.updatedAt), desc(products.id)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ value: count() }).from(products).where(where),
    ]);
    return { items: rows.map(normalize), total: total?.value ?? 0 };
  },
  listCategories() {
    return db.select({ id: categories.id, name: categories.name, status: categories.status }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  },
  async getById(id) {
    const [row] = await db.select(selection).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).where(eq(products.id, id)).limit(1);
    return row ? normalize(row) : null;
  },
  async create(input): Promise<ProductMutationResult> {
    try {
      const result = await db.insert(products).values({ ...input, summary: input.summary ?? null, description: input.description ?? null, coverUrl: input.coverUrl ?? null });
      return { status: "CREATED", id: result[0].insertId };
    } catch (error) { if (isDuplicateEntry(error)) return { status: "SLUG_CONFLICT" }; throw error; }
  },
  async update(input): Promise<ProductMutationResult> {
    try {
      const result = await db.update(products).set({ ...input.data, summary: input.data.summary ?? null, description: input.data.description ?? null, coverUrl: input.data.coverUrl ?? null, version: sql`${products.version} + 1` }).where(and(eq(products.id, input.id), eq(products.version, input.version)));
      if (result[0].affectedRows === 1) return { status: "UPDATED", id: input.id };
      const [exists] = await db.select({ id: products.id }).from(products).where(eq(products.id, input.id)).limit(1);
      return exists ? { status: "CONFLICT" } : { status: "NOT_FOUND" };
    } catch (error) { if (isDuplicateEntry(error)) return { status: "SLUG_CONFLICT" }; throw error; }
  },
  async archive(input): Promise<ProductMutationResult> {
    const result = await db.update(products).set({ status: "ARCHIVED", version: sql`${products.version} + 1` }).where(and(eq(products.id, input.id), eq(products.version, input.version)));
    if (result[0].affectedRows === 1) return { status: "ARCHIVED", id: input.id };
    const [exists] = await db.select({ id: products.id }).from(products).where(eq(products.id, input.id)).limit(1);
    return exists ? { status: "CONFLICT" } : { status: "NOT_FOUND" };
  },
};
