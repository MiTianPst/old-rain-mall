import assert from "node:assert/strict";
import test from "node:test";

import { getAccountOverview } from "./account-overview";

test("个人中心展示当前会员折扣和距离下一等级的金额", () => {
  const overview = getAccountOverview({
    membershipLevel: 1,
    lifetimePaidCents: 1_000_000,
  });

  assert.deepEqual(overview, {
    membershipLabel: "心悦1级",
    discountLabel: "9.8 折",
    nextMembershipLabel: "心悦2级",
    remainingCents: 7_000_000,
    progressPercent: 2.78,
  });
});

test("心悦三级会员显示已达到最高等级", () => {
  const overview = getAccountOverview({
    membershipLevel: 3,
    lifetimePaidCents: 80_000_000,
  });

  assert.deepEqual(overview, {
    membershipLabel: "心悦3级",
    discountLabel: "9 折",
    nextMembershipLabel: null,
    remainingCents: 0,
    progressPercent: 100,
  });
});
