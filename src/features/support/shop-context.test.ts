/** 客服商品上下文测试：验证价格、库存和商品链接只来自公开目录数据。 */
import assert from "node:assert/strict";
import test from "node:test";

import { buildShopContext, selectRelevantShopProducts, supportCatalogPages } from "./shop-context";

test("客服上下文包含真实商品与分类", () => {
  const context = buildShopContext({
    categories: [{ name: "手机", slug: "phones" }],
    products: [{ name: "星河手机", slug: "stellar-phone", summary: "轻薄便携", priceCents: 399900, stock: 3, categoryName: "手机" }],
  });

  assert.match(context, /星河手机/);
  assert.match(context, /¥3,999\.00/);
  assert.match(context, /"库存":3/);
  assert.match(context, /\/products\/stellar-phone/);
  assert.match(context, /手机/);
  assert.match(context, /\?category=phones#catalog/);
});

test("按用户问题找出后页相关商品并优先保留当前商品", () => {
  const products = Array.from({ length: 40 }, (_, index) => ({
    name: `蓝牙耳机 ${index}`,
    slug: `headphones-${index}`,
    summary: "无线耳机",
    priceCents: 39900,
    stock: 4,
    categoryName: "耳机",
  }));
  products[39] = { name: "星河手机", slug: "stellar-phone", summary: "适合拍照", priceCents: 399900, stock: 3, categoryName: "手机" };
  const selected = selectRelevantShopProducts(products, "有适合拍照的手机吗？", "stellar-phone");
  assert.equal(selected[0]?.slug, "stellar-phone");
  assert.ok(selected.length <= 12);
  assert.ok(selected.every((product) => product.slug !== "headphones-20"));
});

test("根据用途和预算优先给出匹配的在售商品", () => {
  const products = [
    { name: "旗舰手机", slug: "expensive-phone", summary: "拍照出色", priceCents: 699900, stock: 4, categoryName: "手机" },
    { name: "轻薄手机", slug: "budget-phone", summary: "拍照便捷", priceCents: 399900, stock: 5, categoryName: "手机" },
    { name: "日常耳机", slug: "headphones", summary: "降噪耐用", priceCents: 29900, stock: 3, categoryName: "耳机" },
  ];
  const selected = selectRelevantShopProducts(products, "预算5000元以内，想买拍照好的手机");
  assert.deepEqual(selected.map((product) => product.slug), ["budget-phone", "expensive-phone"]);
});

test("当前商品的描述和规格进入客服上下文", () => {
  const context = buildShopContext({
    categories: [],
    products: [{
      name: "星河手机", slug: "stellar-phone", summary: "轻薄便携", description: "支持长焦摄影",
      variants: [{ name: "256GB", priceCents: 399900, stock: 2 }],
      priceCents: 399900, stock: 2, categoryName: "手机",
    }],
  });
  assert.match(context, /长焦摄影/);
  assert.match(context, /256GB/);
});

test("没有商品时不读取负页数，商品较多时限定上下文查询页数", () => {
  assert.deepEqual(supportCatalogPages(0), []);
  assert.deepEqual(supportCatalogPages(1), []);
  assert.deepEqual(supportCatalogPages(4), [2, 3, 4]);
  assert.deepEqual(supportCatalogPages(100), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("纯会员问题不附带无关商品", () => {
  const products = [{ name: "星河手机", slug: "stellar-phone", summary: "轻薄", priceCents: 399900, stock: 2, categoryName: "手机" }];
  assert.deepEqual(selectRelevantShopProducts(products, "心悦会员怎么升级？"), []);
});
