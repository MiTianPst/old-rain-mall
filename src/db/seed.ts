import { eq } from "drizzle-orm";

import { db, pool } from "./client";
import { categories, products } from "./schema";

const categorySeeds = [
  {
    name: "生活好物",
    slug: "daily-goods",
    description: "让日常生活更舒适的小物件",
    sortOrder: 10,
  },
  {
    name: "文具纸品",
    slug: "stationery",
    description: "书写、记录与整理用品",
    sortOrder: 20,
  },
  {
    name: "雨具出行",
    slug: "rainy-travel",
    description: "适合雨天和日常通勤的出行用品",
    sortOrder: 30,
  },
] as const;

async function seed() {
  for (const category of categorySeeds) {
    await db
      .insert(categories)
      .values(category)
      .onDuplicateKeyUpdate({
        set: {
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          status: "ACTIVE",
        },
      });
  }

  const seededCategories = await db.select().from(categories);
  const categoryBySlug = new Map(
    seededCategories.map((category) => [category.slug, category.id]),
  );

  const productSeeds = [
    {
      categorySlug: "rainy-travel",
      name: "旧雨折叠伞",
      slug: "old-rain-folding-umbrella",
      summary: "轻巧便携的日常通勤折叠伞",
      description: "采用耐用伞骨与防泼水伞布，适合通勤和短途出行。",
      priceCents: 12900,
      stock: 100,
    },
    {
      categorySlug: "daily-goods",
      name: "暖茶随行杯",
      slug: "warm-tea-tumbler",
      summary: "适合办公室与通勤的简约随行杯",
      description: "杯身简洁耐用，便于日常饮水和携带。",
      priceCents: 8900,
      stock: 80,
    },
    {
      categorySlug: "stationery",
      name: "雨声手账本",
      slug: "rain-sound-notebook",
      summary: "记录日常灵感的布面手账本",
      description: "纸张书写顺滑，适合钢笔、中性笔和铅笔。",
      priceCents: 5900,
      stock: 150,
    },
  ] as const;

  for (const product of productSeeds) {
    const categoryId = categoryBySlug.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(`缺少种子分类：${product.categorySlug}`);
    }

    await db
      .insert(products)
      .values({
        categoryId,
        name: product.name,
        slug: product.slug,
        summary: product.summary,
        description: product.description,
        priceCents: product.priceCents,
        stock: product.stock,
        status: "ACTIVE",
      })
      .onDuplicateKeyUpdate({
        set: {
          categoryId,
          name: product.name,
          summary: product.summary,
          description: product.description,
          priceCents: product.priceCents,
          stock: product.stock,
          status: "ACTIVE",
        },
      });
  }

  const productCount = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.status, "ACTIVE"));

  console.log(
    `种子数据完成：${seededCategories.length} 个分类，${productCount.length} 个上架商品。`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error("种子数据写入失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
