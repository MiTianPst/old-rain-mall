import assert from "node:assert/strict";
import test from "node:test";

import { getQuickPurchaseMode } from "./quick-purchase-mode";

test("单一在售 SKU 可以直接加入购物车", () => {
  assert.deepEqual(
    getQuickPurchaseMode({
      slug: "phone",
      defaultVariantId: 11,
      activeVariantCount: 1,
      stock: 8,
    }),
    { type: "ADD", variantId: 11 },
  );
});

test("多个在售 SKU 必须进入详情选择规格", () => {
  assert.deepEqual(
    getQuickPurchaseMode({
      slug: "phone",
      defaultVariantId: 11,
      activeVariantCount: 2,
      stock: 8,
    }),
    { type: "SELECT", href: "/products/phone" },
  );
});

test("无库存商品不可加入购物车", () => {
  assert.deepEqual(
    getQuickPurchaseMode({
      slug: "phone",
      defaultVariantId: 11,
      activeVariantCount: 1,
      stock: 0,
    }),
    { type: "SOLD_OUT" },
  );
});
