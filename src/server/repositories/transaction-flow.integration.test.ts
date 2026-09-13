import assert from "node:assert/strict";
import test from "node:test";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1";

test("MySQL 下单、取消和过期关闭按 SKU 扣减恢复并记录库存流水", { skip: !runDatabaseTests }, async () => {
  const [{ db, pool }, schema, drizzle, { orderRepository }, { paymentRepository }] = await Promise.all([
    import("@/db"), import("@/db/schema"), import("drizzle-orm"), import("./order-repository"), import("./payment-repository"),
  ]);
  const suffix = `${Date.now()}${crypto.randomUUID().slice(0, 6)}`.replaceAll("-", "");
  const userId = `tx-${crypto.randomUUID()}`.slice(0, 36);
  let categoryId: number | undefined;
  let productId: number | undefined;
  const variantIds: number[] = [];
  const orderNos = [`OR${suffix}A`, `OR${suffix}B`, `OR${suffix}C`].map((value) => value.toUpperCase());
  const paymentNos = [`PAY${suffix}A`, `PAY${suffix}B`, `PAY${suffix}C`].map((value) => value.toUpperCase());

  try {
    await db.insert(schema.users).values({ id: userId, name: "交易测试用户", email: `transaction-${suffix}@example.test`, membershipLevel: 0, lifetimePaidCents: 790_000 });
    const [category] = await db.insert(schema.categories).values({ name: "交易测试分类", slug: `transaction-${suffix}`, status: "ACTIVE" }).$returningId();
    categoryId = category.id;
    const [product] = await db.insert(schema.products).values({ categoryId, name: "交易测试商品", slug: `transaction-product-${suffix}`, priceCents: 999, stock: 999, status: "ACTIVE" }).$returningId();
    productId = product.id;
    const variants = await db.insert(schema.productVariants).values([
      { productId, skuCode: `TX-A-${suffix}`, name: "暖白 / 标准版", attributesJson: JSON.stringify({ color: "暖白", size: "标准版" }), priceCents: 20_000, stock: 10, status: "ACTIVE" },
      { productId, skuCode: `TX-B-${suffix}`, name: "深灰 / 加大版", attributesJson: JSON.stringify({ color: "深灰", size: "加大版" }), priceCents: 25_000, stock: 4, status: "ACTIVE" },
    ]).$returningId();
    variantIds.push(...variants.map((variant) => variant.id));
    const [variantAId, variantBId] = variantIds;
    const [address] = await db.insert(schema.userAddresses).values({ userId, recipientName: "测试收货人", recipientPhone: "13800138000", province: "浙江省", city: "杭州市", district: "西湖区", detailAddress: "测试路 1 号", isDefault: true }).$returningId();

    await db.insert(schema.cartItems).values({ userId, productId, variantId: variantAId!, quantity: 1 });
    const now = new Date();
    assert.deepEqual(await orderRepository.create({ userId, addressId: address.id, now, expiresAt: new Date(now.getTime() + 7_200_000), orderNo: orderNos[0]!, paymentNo: paymentNos[0]! }), { status: "CREATED", orderNo: orderNos[0] });

    const [createdOrder] = await db.select().from(schema.orders).where(drizzle.eq(schema.orders.orderNo, orderNos[0]!));
    assert.equal(createdOrder.status, "PENDING_PAYMENT");
    assert.equal(createdOrder.membershipLevelSnapshot, 0);
    assert.equal(createdOrder.totalCents, 20_000);
    assert.equal(createdOrder.recipientAddress, "浙江省 杭州市 西湖区 测试路 1 号");
    const [createdItem] = await db.select().from(schema.orderItems).where(drizzle.eq(schema.orderItems.orderId, createdOrder.id));
    assert.equal(createdItem.variantId, variantAId);
    assert.equal(createdItem.productName, "交易测试商品");
    assert.equal(createdItem.variantName, "暖白 / 标准版");
    assert.equal(createdItem.variantAttributesJson, JSON.stringify({ color: "暖白", size: "标准版" }));
    assert.equal(createdItem.unitPriceCents, 20_000);
    const [variantAAfterOrder] = await db.select({ stock: schema.productVariants.stock }).from(schema.productVariants).where(drizzle.eq(schema.productVariants.id, variantAId!));
    assert.equal(variantAAfterOrder.stock, 9);
    const [legacyProduct] = await db.select({ stock: schema.products.stock }).from(schema.products).where(drizzle.eq(schema.products.id, productId));
    assert.equal(legacyProduct.stock, 999);
    const firstSale = await db.select().from(schema.inventoryTransactions).where(drizzle.and(drizzle.eq(schema.inventoryTransactions.variantId, variantAId!), drizzle.eq(schema.inventoryTransactions.type, "SALE"), drizzle.eq(schema.inventoryTransactions.referenceId, orderNos[0]!)));
    assert.equal(firstSale.length, 1);
    assert.deepEqual({ delta: firstSale[0]!.quantityDelta, before: firstSale[0]!.stockBefore, after: firstSale[0]!.stockAfter }, { delta: -1, before: 10, after: 9 });
    assert.equal((await db.select().from(schema.cartItems).where(drizzle.eq(schema.cartItems.userId, userId))).length, 0);

    const providerResult = { status: "SUCCESS" as const, paymentNo: paymentNos[0]!, amountCents: 20_000, providerTradeNo: null };
    assert.deepEqual(await paymentRepository.confirm({ userId, orderNo: orderNos[0]!, providerResult, now: new Date(now.getTime() + 1000) }), { status: "PAID", membershipLevel: 1 });
    assert.deepEqual(await paymentRepository.confirm({ userId, orderNo: orderNos[0]!, providerResult, now: new Date(now.getTime() + 2000) }), { status: "ALREADY_PAID", membershipLevel: 1 });

    await db.insert(schema.cartItems).values({ userId, productId, variantId: variantBId!, quantity: 2 });
    const secondNow = new Date(now.getTime() + 3000);
    assert.equal((await orderRepository.create({ userId, addressId: address.id, now: secondNow, expiresAt: new Date(secondNow.getTime() + 7_200_000), orderNo: orderNos[1]!, paymentNo: paymentNos[1]! })).status, "CREATED");
    assert.deepEqual(await orderRepository.cancel({ userId, orderNo: orderNos[1]!, now: new Date(secondNow.getTime() + 1000) }), { status: "CANCELLED" });
    assert.deepEqual(await orderRepository.cancel({ userId, orderNo: orderNos[1]!, now: new Date(secondNow.getTime() + 2000) }), { status: "NOT_CANCELLABLE" });
    const [variantBAfterCancel] = await db.select({ stock: schema.productVariants.stock }).from(schema.productVariants).where(drizzle.eq(schema.productVariants.id, variantBId!));
    assert.equal(variantBAfterCancel.stock, 4);
    const secondTransactions = await db.select().from(schema.inventoryTransactions).where(drizzle.eq(schema.inventoryTransactions.referenceId, orderNos[1]!));
    assert.deepEqual(secondTransactions.map((row) => ({ type: row.type, delta: row.quantityDelta, before: row.stockBefore, after: row.stockAfter })), [
      { type: "SALE", delta: -2, before: 4, after: 2 },
      { type: "CANCEL_RESTORE", delta: 2, before: 2, after: 4 },
    ]);

    await db.insert(schema.cartItems).values({ userId, productId, variantId: variantAId!, quantity: 1 });
    const oldNow = new Date(now.getTime() - 10_800_000);
    assert.equal((await orderRepository.create({ userId, addressId: address.id, now: oldNow, expiresAt: new Date(oldNow.getTime() + 7_200_000), orderNo: orderNos[2]!, paymentNo: paymentNos[2]! })).status, "CREATED");
    assert.deepEqual(await paymentRepository.getPayableOrder({ userId, orderNo: orderNos[2]!, now }), { status: "ORDER_EXPIRED" });
    assert.deepEqual(await paymentRepository.getPayableOrder({ userId, orderNo: orderNos[2]!, now }), { status: "INVALID_STATE" });
    const [variantAAfterExpiry] = await db.select({ stock: schema.productVariants.stock }).from(schema.productVariants).where(drizzle.eq(schema.productVariants.id, variantAId!));
    assert.equal(variantAAfterExpiry.stock, 9);
    const expiryTransactions = await db.select().from(schema.inventoryTransactions).where(drizzle.eq(schema.inventoryTransactions.referenceId, orderNos[2]!));
    assert.deepEqual(expiryTransactions.map((row) => ({ type: row.type, delta: row.quantityDelta, before: row.stockBefore, after: row.stockAfter })), [
      { type: "SALE", delta: -1, before: 9, after: 8 },
      { type: "CANCEL_RESTORE", delta: 1, before: 8, after: 9 },
    ]);
  } finally {
    const orderRows = await db.select({ id: schema.orders.id }).from(schema.orders).where(drizzle.inArray(schema.orders.orderNo, orderNos));
    const orderIds = orderRows.map((row) => row.id);
    if (orderIds.length) {
      await db.delete(schema.membershipLevelLogs).where(drizzle.inArray(schema.membershipLevelLogs.orderId, orderIds));
      await db.delete(schema.payments).where(drizzle.inArray(schema.payments.orderId, orderIds));
      await db.delete(schema.orderItems).where(drizzle.inArray(schema.orderItems.orderId, orderIds));
      await db.delete(schema.orders).where(drizzle.inArray(schema.orders.id, orderIds));
    }
    if (variantIds.length) await db.delete(schema.inventoryTransactions).where(drizzle.inArray(schema.inventoryTransactions.variantId, variantIds));
    await db.delete(schema.cartItems).where(drizzle.eq(schema.cartItems.userId, userId));
    await db.delete(schema.userAddresses).where(drizzle.eq(schema.userAddresses.userId, userId));
    if (variantIds.length) await db.delete(schema.productVariants).where(drizzle.inArray(schema.productVariants.id, variantIds));
    if (productId) await db.delete(schema.products).where(drizzle.eq(schema.products.id, productId));
    if (categoryId) await db.delete(schema.categories).where(drizzle.eq(schema.categories.id, categoryId));
    await db.delete(schema.users).where(drizzle.eq(schema.users.id, userId));
    await pool.end();
  }
});
