import "server-only";

import { and, count, desc, eq, like, or } from "drizzle-orm";

import type { CatalogQuery } from "@/features/catalog/query";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import type {
  CatalogRepository,
  ProductRecord,
} from "@/server/services/catalog-service";

function publicProductWhere(query?: Pick<CatalogQuery, "search" | "category">) {
  const searchPattern = query?.search ? `%${query.search}%` : undefined;

  return and(
    eq(products.status, "ACTIVE"),
    eq(categories.status, "ACTIVE"),
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
  stock: products.stock,
  coverUrl: products.coverUrl,
  category: {
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
  },
};

export const catalogRepository: CatalogRepository = {
  async listProducts(query, pageSize) {
    return db
      .select(productSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(publicProductWhere(query))
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(pageSize)
      .offset((query.page - 1) * pageSize) as Promise<ProductRecord[]>;
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

    return row ?? null;
  },

  async findProductBySlug(slug) {
    const [row] = await db
      .select(productSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(publicProductWhere(), eq(products.slug, slug)))
      .limit(1);

    return row ?? null;
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
