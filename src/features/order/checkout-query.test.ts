import assert from "node:assert/strict";
import test from "node:test";

import { parseCheckoutQuery } from "./checkout-query";

test("立即购买结算只解析正整数 SKU", () => {
  assert.deepEqual(parseCheckoutQuery({ buyNowVariantId: "12" }), {
    buyNowVariantId: 12,
  });
  assert.deepEqual(parseCheckoutQuery({}), {});
  assert.deepEqual(parseCheckoutQuery({ buyNowVariantId: "" }), { buyNowVariantId: undefined });
});

test("立即购买结算拒绝非法 SKU 参数", () => {
  assert.throws(() => parseCheckoutQuery({ buyNowVariantId: "0" }), /商品规格参数不正确/);
  assert.throws(() => parseCheckoutQuery({ buyNowVariantId: "abc" }), /商品规格参数不正确/);
});
