import assert from "node:assert/strict";
import test from "node:test";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1";

test(
  "MySQL 购物车按 SKU 分行并校验 SKU、商品和分类可售性",
  { skip: !runDatabaseTests },
  async () => {
    const [{ db, pool }, schema, { cartRepository }, drizzle] =
      await Promise.all([
        import("@/db"),
        import("@/db/schema"),
        import("./cart-repository"),
        import("drizzle-orm"),
      ]);
    const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const ownerId = `owner-${crypto.randomUUID()}`.slice(0, 36);
    const strangerId = `stranger-${crypto.randomUUID()}`.slice(0, 36);
    let activeCategoryId: number | undefined;
    let hiddenCategoryId: number | undefined;
    let activeProductId: number | undefined;
    let hiddenProductId: number | undefined;
    const variantIds: number[] = [];

    try {
      await db.insert(schema.users).values([
        {
          id: ownerId,
          name: "购物车测试用户",
          email: `owner-${suffix}@example.test`,
        },
        {
          id: strangerId,
          name: "其他测试用户",
          email: `stranger-${suffix}@example.test`,
        },
      ]);

      const [activeCategory] = await db
        .insert(schema.categories)
        .values({
          name: "公开测试分类",
          slug: `active-${suffix}`,
          status: "ACTIVE",
        })
        .$returningId();
      const [hiddenCategory] = await db
        .insert(schema.categories)
        .values({
          name: "隐藏测试分类",
          slug: `hidden-${suffix}`,
          status: "HIDDEN",
        })
        .$returningId();
      activeCategoryId = activeCategory.id;
      hiddenCategoryId = hiddenCategory.id;

      const [activeProduct] = await db
        .insert(schema.products)
        .values({
          categoryId: activeCategoryId,
          name: "公开测试商品",
          slug: `active-product-${suffix}`,
          priceCents: 1000,
          stock: 5,
          status: "ACTIVE",
        })
        .$returningId();
      const [hiddenProduct] = await db
        .insert(schema.products)
        .values({
          categoryId: hiddenCategoryId,
          name: "隐藏测试商品",
          slug: `hidden-product-${suffix}`,
          priceCents: 1000,
          stock: 5,
          status: "ACTIVE",
        })
        .$returningId();
      activeProductId = activeProduct.id;
      hiddenProductId = hiddenProduct.id;

      const variants = await db
        .insert(schema.productVariants)
        .values([
          {
            productId: activeProductId,
            skuCode: `ACTIVE-A-${suffix}`,
            name: "暖白",
            attributesJson: JSON.stringify({ color: "暖白" }),
            priceCents: 1200,
            stock: 5,
            status: "ACTIVE",
          },
          {
            productId: activeProductId,
            skuCode: `ACTIVE-B-${suffix}`,
            name: "深灰",
            attributesJson: JSON.stringify({ color: "深灰" }),
            priceCents: 1500,
            stock: 3,
            status: "ACTIVE",
          },
          {
            productId: activeProductId,
            skuCode: `ARCHIVED-${suffix}`,
            name: "旧规格",
            attributesJson: "{}",
            priceCents: 800,
            stock: 9,
            status: "ARCHIVED",
          },
          {
            productId: hiddenProductId,
            skuCode: `HIDDEN-${suffix}`,
            name: "隐藏分类规格",
            attributesJson: "{}",
            priceCents: 900,
            stock: 9,
            status: "ACTIVE",
          },
        ])
        .$returningId();
      variantIds.push(...variants.map((variant) => variant.id));
      const [firstVariantId, secondVariantId, archivedVariantId, hiddenVariantId] = variantIds;

      assert.deepEqual(
        await cartRepository.addItem({
          userId: ownerId,
          variantId: hiddenVariantId!,
          quantity: 1,
        }),
        { status: "PRODUCT_UNAVAILABLE" },
      );
      assert.deepEqual(
        await cartRepository.addItem({
          userId: ownerId,
          variantId: archivedVariantId!,
          quantity: 1,
        }),
        { status: "PRODUCT_UNAVAILABLE" },
      );

      assert.deepEqual(
        await cartRepository.addItem({
          userId: ownerId,
          variantId: firstVariantId!,
          quantity: 1,
        }),
        { status: "ADDED", quantity: 1 },
      );
      assert.deepEqual(
        await cartRepository.addItem({
          userId: ownerId,
          variantId: firstVariantId!,
          quantity: 1,
        }),
        { status: "ADDED", quantity: 2 },
      );
      assert.deepEqual(
        await cartRepository.addItem({
          userId: ownerId,
          variantId: secondVariantId!,
          quantity: 1,
        }),
        { status: "ADDED", quantity: 1 },
      );

      const items = await db
        .select({ id: schema.cartItems.id, variantId: schema.cartItems.variantId })
        .from(schema.cartItems)
        .where(drizzle.eq(schema.cartItems.userId, ownerId))
        .orderBy(schema.cartItems.variantId);
      assert.equal(items.length, 2);
      const item = items.find((candidate) => candidate.variantId === firstVariantId)!;

      assert.deepEqual(
        await cartRepository.updateItem({
          userId: strangerId,
          cartItemId: item.id,
          quantity: 3,
        }),
        { status: "ITEM_NOT_FOUND" },
      );
      assert.equal(
        await cartRepository.removeItem({
          userId: strangerId,
          cartItemId: item.id,
        }),
        false,
      );

      assert.deepEqual(
        await cartRepository.updateItem({
          userId: ownerId,
          cartItemId: item.id,
          quantity: 5,
        }),
        { status: "UPDATED", quantity: 5 },
      );
      assert.deepEqual(
        await cartRepository.updateItem({
          userId: ownerId,
          cartItemId: item.id,
          quantity: 6,
        }),
        { status: "STOCK_EXCEEDED", stock: 5 },
      );

      const [listedItem] = await cartRepository.listItems(ownerId);
      const listedFirst = (await cartRepository.listItems(ownerId)).find(
        (candidate) => candidate.product.variantId === firstVariantId,
      )!;
      assert.equal(listedFirst.id, item.id);
      assert.equal(listedFirst.quantity, 5);
      assert.equal(listedFirst.product.variantName, "暖白");
      assert.deepEqual(listedFirst.product.variantAttributes, { color: "暖白" });
      assert.equal(listedFirst.product.priceCents, 1200);
      assert.equal(listedFirst.product.stock, 5);
      assert.equal(listedItem.product.categoryStatus, "ACTIVE");

      await db
        .update(schema.categories)
        .set({ status: "HIDDEN" })
        .where(drizzle.eq(schema.categories.id, activeCategoryId));
      assert.deepEqual(
        await cartRepository.updateItem({
          userId: ownerId,
          cartItemId: item.id,
          quantity: 4,
        }),
        { status: "PRODUCT_UNAVAILABLE" },
      );

      assert.equal(
        await cartRepository.removeItem({
          userId: ownerId,
          cartItemId: item.id,
        }),
        true,
      );
      assert.equal(
        await cartRepository.removeItem({
          userId: ownerId,
          cartItemId: item.id,
        }),
        false,
      );
    } finally {
      await db
        .delete(schema.users)
        .where(drizzle.inArray(schema.users.id, [ownerId, strangerId]));
      if (variantIds.length) {
        await db
          .delete(schema.productVariants)
          .where(drizzle.inArray(schema.productVariants.id, variantIds));
      }
      if (activeProductId && hiddenProductId) {
        await db
          .delete(schema.products)
          .where(
            drizzle.inArray(schema.products.id, [
              activeProductId,
              hiddenProductId,
            ]),
          );
      }
      if (activeCategoryId && hiddenCategoryId) {
        await db
          .delete(schema.categories)
          .where(
            drizzle.inArray(schema.categories.id, [
              activeCategoryId,
              hiddenCategoryId,
            ]),
          );
      }
      await pool.end();
    }
  },
);
