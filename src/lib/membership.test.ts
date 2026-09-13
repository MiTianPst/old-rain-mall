import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMemberPrice,
  getDiscountRateBps,
  getMembershipLevel,
} from "./membership";
import { calculateOrderPricing } from "@/features/order/pricing";

test("累计实付达到门槛时升级到对应心悦等级", () => {
  assert.equal(getMembershipLevel(799_999), 0);
  assert.equal(getMembershipLevel(800_000), 1);
  assert.equal(getMembershipLevel(8_000_000), 2);
  assert.equal(getMembershipLevel(80_000_000), 3);
  assert.equal(getDiscountRateBps(1), 9800);
  assert.equal(getDiscountRateBps(2), 9500);
  assert.equal(getDiscountRateBps(3), 9000);
});

test("会员价格向下取整到整数分且订单全部包邮", () => {
  assert.deepEqual(calculateMemberPrice(10_001, 1), {
    originalAmountCents: 10_001,
    discountedAmountCents: 9_800,
    memberDiscountCents: 201,
    discountRateBps: 9800,
  });
  assert.deepEqual(calculateOrderPricing({ originalAmountCents: 10_001, membershipLevel: 1 }), {
    discountRateBps: 9800,
    memberDiscountCents: 201,
    shippingFeeCents: 0,
    totalCents: 9_800,
  });
});
