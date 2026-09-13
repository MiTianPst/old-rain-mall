import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import type { AdminCategoryRepository, CategoryMutationResult } from "@/server/services/admin-category-service";
function duplicate(error: unknown) { if (!error || typeof error !== "object") return false; const value = error as { code?: unknown; errno?: unknown }; return value.code === "ER_DUP_ENTRY" || value.errno === 1062; }
export const adminCategoryRepository: AdminCategoryRepository = {
  async list() {
    const rows = await db.select({ id: categories.id, name: categories.name, slug: categories.slug, description: categories.description, sortOrder: categories.sortOrder, status: categories.status, productCount: count(products.id), createdAt: categories.createdAt, updatedAt: categories.updatedAt }).from(categories).leftJoin(products, eq(products.categoryId, categories.id)).groupBy(categories.id).orderBy(asc(categories.sortOrder), asc(categories.id));
    return rows.map((row) => ({ ...row, description: row.description ?? undefined }));
  },
  async create(input): Promise<CategoryMutationResult> { try { const result = await db.insert(categories).values({ ...input, description: input.description ?? null }); return { status: "CREATED", id: result[0].insertId }; } catch (error) { if (duplicate(error)) return { status: "SLUG_CONFLICT" }; throw error; } },
  async update(input): Promise<CategoryMutationResult> { try { const result = await db.update(categories).set({ ...input.data, description: input.data.description ?? null }).where(eq(categories.id, input.id)); return result[0].affectedRows === 1 ? { status: "UPDATED", id: input.id } : { status: "NOT_FOUND" }; } catch (error) { if (duplicate(error)) return { status: "SLUG_CONFLICT" }; throw error; } },
  async setStatus(input): Promise<CategoryMutationResult> { const result = await db.update(categories).set({ status: input.status }).where(eq(categories.id, input.id)); return result[0].affectedRows === 1 ? { status: "STATUS_CHANGED", id: input.id } : { status: "NOT_FOUND" }; },
};
