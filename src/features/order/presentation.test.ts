import assert from "node:assert/strict";
import test from "node:test";

import { formatVariantSnapshot } from "./presentation";

test("订单规格快照展示名称和属性，并为历史空规格提供默认文案", () => {
  assert.equal(
    formatVariantSnapshot("暖白", JSON.stringify({ color: "暖白", size: "标准版" })),
    "暖白 · 暖白 / 标准版",
  );
  assert.equal(formatVariantSnapshot("", "{}"), "默认规格");
  assert.equal(formatVariantSnapshot("", "不是 JSON"), "默认规格");
});
