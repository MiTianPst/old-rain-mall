import assert from "node:assert/strict";
import test from "node:test";

import { getCartQuantityControls } from "./cart-quantity";

test("购物车数量控件在 1 和库存/99 之间计算加减值", () => {
  assert.deepEqual(getCartQuantityControls({ quantity: 1, stock: 5 }), {
    previous: null,
    next: 2,
    max: 5,
  });
  assert.deepEqual(getCartQuantityControls({ quantity: 5, stock: 5 }), {
    previous: 4,
    next: null,
    max: 5,
  });
  assert.deepEqual(getCartQuantityControls({ quantity: 99, stock: 120 }), {
    previous: 98,
    next: null,
    max: 99,
  });
});
