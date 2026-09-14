import "server-only";

import { and, asc, count, desc, eq, exists, like, or, sql } from "drizzle-orm";

import type { CatalogQuery } from "@/features/catalog/query";
import { db } from "@/db";
import {
  categories,
  productImages,
  products,
  productVariants,
} from "@/db/schema";
import type {
  CatalogRepository,
  ProductImageDto,
  ProductRecord,
  ProductVariantDto,
} from "@/server/services/catalog-service";

function publicProductWhere(query?: Pick<CatalogQuery, "search" | "category">) {
  const searchPattern = query?.search ? `%${query.search}%` : undefined;

  return and(
    eq(products.status, "ACTIVE"),
    eq(categories.status, "ACTIVE"),
    exists(
      db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, products.id),
            eq(productVariants.status, "ACTIVE"),
          ),
        ),
    ),
    query?.category ? eq(categories.slug, query.category) : undefined,
    searchPattern
      ? or(
          like(products.name, searchPattern),
          like(products.summary, searchPattern),
          like(products.description, searchPattern),
        )
      : undefined,
  );
}

const productSelection = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  summary: products.summary,
  description: products.description,
  priceCents: products.priceCents,
  compareAtPriceCents: products.compareAtPriceCents,
  promotionLabel: products.promotionLabel,
  salesCount: sql<number>`(
    select coalesce(sum(oi.quantity), 0)
    from order_items oi
    inner join orders o on o.id = oi.order_id
    inner join payments pay on pay.order_id = o.id
    where oi.product_id = ${products.id}
      and pay.status = 'SUCCESS'
      and o.status not in ('CANCELLED', 'CLOSED', 'REFUNDED')
  )`.mapWith(Number),
  stock: products.stock,
  coverUrl: products.coverUrl,
  category: {
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
  },
};

export async function findDefaultActiveVariant(productId: number) {
  const [variant] = await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      priceCents: productVariants.priceCents,
      stock: productVariants.stock,
    })
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.status, "ACTIVE")))
    .orderBy(asc(productVariants.id))
    .limit(1);
  return variant ?? null;
}

export const catalogRepository: CatalogRepository = {
  async listProducts(query, pageSize) {
    const rows = await db
      .select(productSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(publicProductWhere(query))
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(pageSize)
      .offset((query.page - 1) * pageSize);

    return Promise.all(rows.map((row) => hydrateProduct(row, false)));
  },

  async countProducts(query) {
    const [row] = await db
      .select({ value: count(products.id) })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(publicProductWhere(query));

    return row?.value ?? 0;
  },

  async findProductById(id) {
    const [row] = await db
      .select(productSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(publicProductWhere(), eq(products.id, id)))
      .limit(1);

    return row ? hydrateProduct(row, true) : null;
  },

  async findProductBySlug(slug) {
    const [row] = await db
      .select(productSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(publicProductWhere(), eq(products.slug, slug)))
      .limit(1);

    return row ? hydrateProduct(row, true) : null;
  },

  async listCategories() {
    return db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        productCount: count(products.id),
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          eq(products.status, "ACTIVE"),
          exists(
            db
              .select({ id: productVariants.id })
              .from(productVariants)
              .where(
                and(
                  eq(productVariants.productId, products.id),
                  eq(productVariants.status, "ACTIVE"),
                ),
              ),
          ),
        ),
      )
      .where(eq(categories.status, "ACTIVE"))
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.description,
        categories.sortOrder,
      )
      .orderBy(categories.sortOrder, categories.id);
  },
};

async function hydrateProduct(
  row: ProductBaseRow,
  includeArchivedVariants: boolean,
): Promise<ProductRecord> {
  const [variants, images] = await Promise.all([
    listProductVariants(row.id, includeArchivedVariants),
    listProductImages(row.id),
  ]);
  const defaultVariant = variants.find((variant) => variant.status === "ACTIVE");
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0];

  return {
    ...row,
    priceCents: defaultVariant?.priceCents ?? row.priceCents,
    stock: variants
      .filter((variant) => variant.status === "ACTIVE")
      .reduce((total, variant) => total + variant.stock, 0),
    coverUrl: primaryImage?.url ?? row.coverUrl,
    variants,
    images,
  };
}

type ProductBaseRow = {
  id: number;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  promotionLabel: string | null;
  salesCount: number;
  stock: number;
  coverUrl: string | null;
  category: {
    id: number;
    name: string;
    slug: string;
  };
};

async function listProductVariants(
  productId: number,
  includeArchived: boolean,
): Promise<ProductVariantDto[]> {
  const rows = await db
    .select({
      id: productVariants.id,
      skuCode: productVariants.skuCode,
      name: productVariants.name,
      attributesJson: productVariants.attributesJson,
      priceCents: productVariants.priceCents,
      stock: productVariants.stock,
      status: productVariants.status,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        includeArchived
          ? undefined
          : eq(productVariants.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(productVariants.id));

  return rows.map((row) => ({
    id: row.id,
    skuCode: row.skuCode,
    name: row.name,
    attributes: parseVariantAttributes(row.attributesJson, row.id),
    priceCents: row.priceCents,
    stock: row.stock,
    status: row.status,
  }));
}

async function listProductImages(productId: number): Promise<ProductImageDto[]> {
  return db
    .select({
      id: productImages.id,
      url: productImages.url,
      altText: productImages.altText,
      isPrimary: productImages.isPrimary,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(
      desc(productImages.isPrimary),
      asc(productImages.sortOrder),
      asc(productImages.id),
    );
}

function parseVariantAttributes(
  attributesJson: string,
  variantId: number,
): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(attributesJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch (error) {
    console.error("[catalog] SKU 属性解析失败", {
      variantId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {};
  }
}
