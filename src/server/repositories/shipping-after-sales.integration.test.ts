import assert from "node:assert/strict";
import test from "node:test";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1";

test("MySQL 可以写入一单物流和一条售后记录并遵守唯一约束", { skip: !runDatabaseTests }, async () => {
  const [{ db, pool }, schema, drizzle] = await Promise.all([import("@/db"), import("@/db/schema"), import("drizzle-orm")]);
  const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const userId = `shipping-${crypto.randomUUID()}`.slice(0, 36);
  let categoryId: number | undefined;
  let productId: number | undefined;
  let orderId: number | undefined;
  let shipmentId: number | undefined;
  let afterSaleId: number | undefined;
  const now = new Date();
  try {
    await db.insert(schema.users).values({ id: userId, name: "物流测试用户", email: `shipping-${suffix}@example.test` });
    const [category] = await db.insert(schema.categories).values({ name: "物流测试分类", slug: `shipping-${suffix}` }).$returningId();
    categoryId = category.id;
    const [product] = await db.insert(schema.products).values({ categoryId: category.id, name: "物流测试商品", slug: `shipping-product-${suffix}`, priceCents: 1000, stock: 0, status: "ACTIVE" }).$returningId();
    productId = product.id;
    const [order] = await db.insert(schema.orders).values({ orderNo: `OR${suffix.replace(/[^A-Z0-9]/gi, "").slice(-20).toUpperCase()}`, userId, status: "PAID", paymentStatus: "SUCCESS", originalAmountCents: 1000, discountRateBps: 10000, memberDiscountCents: 0, shippingFeeCents: 0, totalCents: 1000, recipientName: "测试", recipientPhone: "13800000000", recipientAddress: "上海市", expiresAt: new Date(now.getTime() + 3600000), paidAt: now }).$returningId();
    orderId = order.id;
    const [shipment] = await db.insert(schema.shipments).values({ orderId: order.id, carrier: "顺丰速运", trackingNo: `SF${suffix.replace(/[^A-Z0-9]/gi, "").slice(-12)}`, status: "SHIPPED", shippedAt: now }).$returningId();
    shipmentId = shipment.id;
    const [sale] = await db.insert(schema.afterSales).values({ orderId: order.id, userId, reason: "商品破损", description: "包装和商品均有破损", refundAmountCents: 1000 }).$returningId();
    afterSaleId = sale.id;
    assert.ok(shipmentId);
    assert.ok(afterSaleId);
    await assert.rejects(() => db.insert(schema.shipments).values({ orderId: order.id, carrier: "其他", trackingNo: "DUPLICATE", status: "SHIPPED" }));
    await assert.rejects(() => db.insert(schema.afterSales).values({ orderId: order.id, userId, reason: "重复", description: "重复售后申请", refundAmountCents: 1000 }));
  } finally {
    if (afterSaleId) await db.delete(schema.afterSales).where(drizzle.eq(schema.afterSales.id, afterSaleId));
    if (shipmentId) await db.delete(schema.shipments).where(drizzle.eq(schema.shipments.id, shipmentId));
    if (orderId) await db.delete(schema.orders).where(drizzle.eq(schema.orders.id, orderId));
    if (productId) await db.delete(schema.products).where(drizzle.eq(schema.products.id, productId));
    if (categoryId) await db.delete(schema.categories).where(drizzle.eq(schema.categories.id, categoryId));
    await db.delete(schema.users).where(drizzle.eq(schema.users.id, userId));
    await pool.end();
  }
});
