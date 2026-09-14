import "server-only";

import { and, asc, count, desc, eq, inArray, like, notInArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, inventoryTransactions, productImages, products, productVariants } from "@/db/schema";
import { yuanToCents } from "@/features/admin/product-schema";
import type { AdminProductRecord, AdminProductRepository, ProductMutationResult } from "@/server/services/admin-product-service";

function isDuplicateEntry(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; errno?: unknown };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}

const selection = {
  id: products.id, categoryId: products.categoryId, categoryName: categories.name,
  name: products.name, slug: products.slug, summary: products.summary,
  description: products.description, priceCents: products.priceCents, stock: products.stock,
  compareAtPriceCents: products.compareAtPriceCents, isFeatured: products.isFeatured,
  featuredSort: products.featuredSort, promotionLabel: products.promotionLabel,
  status: products.status, coverUrl: products.coverUrl, version: products.version,
  createdAt: products.createdAt, updatedAt: products.updatedAt,
};

function parseAttributes(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch { return {}; }
}

function normalize<T extends { summary: string | null; description: string | null; coverUrl: string | null; compareAtPriceCents: number | null; promotionLabel: string | null }>(row: T) {
  return {
    ...row,
    summary: row.summary ?? undefined,
    description: row.description ?? undefined,
    coverUrl: row.coverUrl ?? undefined,
    compareAtPriceCents: row.compareAtPriceCents ?? undefined,
    promotionLabel: row.promotionLabel ?? undefined,
    variants: [],
  };
}

async function attachVariants(rows: AdminProductRecord[]): Promise<AdminProductRecord[]> {
  if (rows.length === 0) return rows;
  const variants = await db.select({
    id: productVariants.id, productId: productVariants.productId, skuCode: productVariants.skuCode,
    name: productVariants.name, attributesJson: productVariants.attributesJson,
    priceCents: productVariants.priceCents, stock: productVariants.stock, status: productVariants.status,
  }).from(productVariants).where(inArray(productVariants.productId, rows.map((row) => row.id))).orderBy(asc(productVariants.id));
  const byProduct = new Map<number, AdminProductRecord["variants"]>();
  for (const variant of variants) {
    const item = { id: variant.id, skuCode: variant.skuCode, name: variant.name, attributes: parseAttributes(variant.attributesJson), priceYuan: (variant.priceCents / 100).toFixed(2), stock: variant.stock, status: variant.status };
    const current = byProduct.get(variant.productId) ?? [];
    current.push(item);
    byProduct.set(variant.productId, current);
  }
  return rows.map((row) => ({ ...row, variants: byProduct.get(row.id) ?? [] }));
}

async function attachImages(rows: AdminProductRecord[]): Promise<AdminProductRecord[]> {
  if (rows.length === 0) return rows;
  const images = await db.select({
    id: productImages.id,
    productId: productImages.productId,
    url: productImages.url,
    altText: productImages.altText,
    isPrimary: productImages.isPrimary,
    sortOrder: productImages.sortOrder,
  }).from(productImages).where(inArray(productImages.productId, rows.map((row) => row.id))).orderBy(asc(productImages.sortOrder), asc(productImages.id));
  const byProduct = new Map<number, AdminProductRecord["images"]>();
  for (const image of images) {
    const current = byProduct.get(image.productId) ?? [];
    current.push({ id: image.id, url: image.url, altText: image.altText, isPrimary: image.isPrimary, sortOrder: image.sortOrder });
    byProduct.set(image.productId, current);
  }
  return rows.map((row) => ({ ...row, images: byProduct.get(row.id) ?? [] }));
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
    return { items: await attachVariants(rows.map(normalize)), total: total?.value ?? 0 };
  },
  listCategories() {
    return db.select({ id: categories.id, name: categories.name, status: categories.status }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  },
  async getById(id) {
    const [row] = await db.select(selection).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).where(eq(products.id, id)).limit(1);
    if (!row) return null;
    const withVariants = await attachVariants([normalize(row)]);
    return (await attachImages(withVariants))[0] ?? null;
  },
  async create(input): Promise<ProductMutationResult> {
    try {
      return await db.transaction(async (transaction) => {
        const result = await transaction.insert(products).values({
          ...input,
          summary: input.summary ?? null,
          description: input.description ?? null,
          coverUrl: input.coverUrl ?? null,
          compareAtPriceCents: input.compareAtPriceCents ?? null,
          promotionLabel: input.promotionLabel ?? null,
        });
        const productId = Number(result[0].insertId);
        const [variant] = await transaction.insert(productVariants).values({
          productId,
          skuCode: `${input.slug}-default`,
          name: "默认规格",
          attributesJson: "{}",
          priceCents: input.priceCents,
          stock: 0,
          status: "ACTIVE",
        }).$returningId();
        await transaction.insert(inventoryTransactions).values({
          variantId: variant.id,
          type: "INITIAL",
          quantityDelta: 0,
          stockBefore: 0,
          stockAfter: 0,
          referenceType: "PRODUCT",
          referenceId: String(productId),
          note: "后台创建商品默认 SKU",
        });
        return { status: "CREATED" as const, id: productId };
      });
    } catch (error) { if (isDuplicateEntry(error)) return { status: "SLUG_CONFLICT" }; throw error; }
  },
  async update(input): Promise<ProductMutationResult> {
    try {
      return await db.transaction(async (transaction) => {
        const result = await transaction.update(products).set({
          ...input.data,
          summary: input.data.summary ?? null,
          description: input.data.description ?? null,
          coverUrl: input.data.coverUrl ?? null,
          compareAtPriceCents: input.data.compareAtPriceCents ?? null,
          promotionLabel: input.data.promotionLabel ?? null,
          version: sql`${products.version} + 1`,
        }).where(and(eq(products.id, input.id), eq(products.version, input.version)));
        if (result[0].affectedRows === 1) return { status: "UPDATED" as const, id: input.id };
        const [exists] = await transaction.select({ id: products.id }).from(products).where(eq(products.id, input.id)).limit(1);
        return exists ? { status: "CONFLICT" as const } : { status: "NOT_FOUND" as const };
      });
    } catch (error) { if (isDuplicateEntry(error)) return { status: "SLUG_CONFLICT" }; throw error; }
  },
  async archive(input): Promise<ProductMutationResult> {
    const result = await db.update(products).set({ status: "ARCHIVED", version: sql`${products.version} + 1` }).where(and(eq(products.id, input.id), eq(products.version, input.version)));
    if (result[0].affectedRows === 1) return { status: "ARCHIVED", id: input.id };
    const [exists] = await db.select({ id: products.id }).from(products).where(eq(products.id, input.id)).limit(1);
    return exists ? { status: "CONFLICT" } : { status: "NOT_FOUND" };
  },
  async updateVariants(input): Promise<ProductMutationResult> {
    try {
      return await db.transaction(async (transaction) => {
        const [product] = await transaction.select({ id: products.id, version: products.version }).from(products).where(eq(products.id, input.productId)).limit(1).for("update");
        if (!product) return { status: "NOT_FOUND" as const };
        if (product.version !== input.version) return { status: "CONFLICT" as const };

        const existing = await transaction.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.productId, input.productId)).for("update");
        const existingIds = new Set(existing.map((variant) => variant.id));
        const submittedIds = input.variants.flatMap((variant) => variant.id ? [variant.id] : []);
        if (new Set(submittedIds).size !== submittedIds.length || submittedIds.some((id) => !existingIds.has(id))) {
          return { status: "NOT_FOUND" as const };
        }

        for (const variant of input.variants) {
          const values = {
            skuCode: variant.skuCode,
            name: variant.name,
            attributesJson: JSON.stringify(variant.attributes),
            priceCents: yuanToCents(variant.priceYuan)!,
            status: variant.status,
          };
          if (variant.id) {
            await transaction.update(productVariants).set(values).where(and(eq(productVariants.id, variant.id), eq(productVariants.productId, input.productId)));
          } else {
            const [created] = await transaction.insert(productVariants).values({ ...values, productId: input.productId, stock: variant.stock }).$returningId();
            await transaction.insert(inventoryTransactions).values({
              variantId: created.id, type: "INITIAL", quantityDelta: variant.stock,
              stockBefore: 0, stockAfter: variant.stock, referenceType: "PRODUCT", referenceId: String(input.productId),
              note: "后台创建 SKU 初始库存",
            });
          }
        }
        const keptIds = submittedIds;
        if (existing.length > 0) {
          const where = keptIds.length
            ? and(eq(productVariants.productId, input.productId), notInArray(productVariants.id, keptIds))
            : eq(productVariants.productId, input.productId);
          await transaction.update(productVariants).set({ status: "ARCHIVED" }).where(where);
        }
        await transaction.update(products).set({ version: sql`${products.version} + 1` }).where(and(eq(products.id, input.productId), eq(products.version, input.version)));
        return { status: "UPDATED" as const, id: input.productId };
      });
    } catch (error) {
      if (isDuplicateEntry(error)) return { status: "SKU_CONFLICT" };
      throw error;
    }
  },
};
