import assert from "node:assert/strict";
import test from "node:test";

import { formatCny } from "./money";

test("整数分格式化为中文人民币价格", () => {
  assert.equal(formatCny(12900), "¥129.00");
  assert.equal(formatCny(59), "¥0.59");
});
