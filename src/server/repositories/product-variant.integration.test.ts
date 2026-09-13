import assert from "node:assert/strict";
import test from "node:test";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1";

test(
  "MySQL 可以创建商品 SKU 并记录初始库存流水",
  { skip: !runDatabaseTests },
  async () => {
    const [{ db, pool }, schema, drizzle] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);
    const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const userId = `variant-${crypto.randomUUID()}`.slice(0, 36);
    let categoryId: number | undefined;
    let productId: number | undefined;
    let variantId: number | undefined;

    try {
      await db.insert(schema.users).values({
        id: userId,
        name: "SKU 测试用户",
        email: `variant-${suffix}@example.test`,
      });
      const [category] = await db.insert(schema.categories).values({
        name: "SKU 测试分类",
        slug: `variant-${suffix}`,
        status: "ACTIVE",
      }).$returningId();
      categoryId = category.id;
      const [product] = await db.insert(schema.products).values({
        categoryId,
        name: "SKU 测试商品",
        slug: `variant-product-${suffix}`,
        priceCents: 1000,
        stock: 5,
        status: "ACTIVE",
      }).$returningId();
      productId = product.id;

      const [variant] = await db.insert(schema.productVariants).values({
        productId,
        skuCode: `SKU-${suffix}`,
        name: "默认规格",
        attributesJson: JSON.stringify({}),
        priceCents: 1000,
        stock: 5,
        status: "ACTIVE",
      }).$returningId();
      variantId = variant.id;
      assert.ok(variantId);
      await db.insert(schema.inventoryTransactions).values({
        variantId,
        type: "INITIAL",
        quantityDelta: 5,
        stockBefore: 0,
        stockAfter: 5,
        referenceType: "SEED",
        referenceId: String(variantId),
      });

      const [storedVariant] = await db
        .select({
          priceCents: schema.productVariants.priceCents,
          stock: schema.productVariants.stock,
        })
        .from(schema.productVariants)
        .where(drizzle.eq(schema.productVariants.id, variantId));
      const [storedTransaction] = await db
        .select({ type: schema.inventoryTransactions.type })
        .from(schema.inventoryTransactions)
        .where(drizzle.eq(schema.inventoryTransactions.variantId, variantId));

      assert.deepEqual(storedVariant, { priceCents: 1000, stock: 5 });
      assert.equal(storedTransaction.type, "INITIAL");
    } finally {
      if (variantId) {
        await db.delete(schema.inventoryTransactions).where(
          drizzle.eq(schema.inventoryTransactions.variantId, variantId),
        );
        await db.delete(schema.productVariants).where(
          drizzle.eq(schema.productVariants.id, variantId),
        );
      }
      if (productId) {
        await db.delete(schema.products).where(drizzle.eq(schema.products.id, productId));
      }
      if (categoryId) {
        await db.delete(schema.categories).where(drizzle.eq(schema.categories.id, categoryId));
      }
      await db.delete(schema.users).where(drizzle.eq(schema.users.id, userId));
      await pool.end();
    }
  },
);
