import assert from "node:assert/strict";
import test from "node:test";

import { getMembershipProgress } from "./membership-progress";

test("会员进度按当前等级区间计算下一等级差额", () => {
  assert.deepEqual(getMembershipProgress(790_000, 0), {
    nextLevel: 1,
    remainingCents: 10_000,
    progressPercent: 98.75,
  });
  assert.deepEqual(getMembershipProgress(1_000_000, 1), {
    nextLevel: 2,
    remainingCents: 7_000_000,
    progressPercent: 2.78,
  });
});

test("心悦三级不再计算下一等级", () => {
  assert.equal(getMembershipProgress(80_000_000, 3), null);
});
