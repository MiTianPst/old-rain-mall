import assert from "node:assert/strict";
import test from "node:test";

import { isRatingHighlighted } from "./rating-stars";

test("评分星星按选择值连续点亮", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((star) => isRatingHighlighted(star, 4)), [true, true, true, true, false]);
  assert.deepEqual([1, 2, 3, 4, 5].map((star) => isRatingHighlighted(star, 2)), [true, true, false, false, false]);
});
