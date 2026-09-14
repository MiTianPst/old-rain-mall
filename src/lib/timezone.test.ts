import assert from "node:assert/strict";
import { test } from "node:test";

import { formatOrderTime } from "@/features/order/presentation";
import { getShanghaiDayRange } from "@/lib/timezone";

test("上海当天边界按 UTC+8 计算", () => {
  const { start, endExclusive } = getShanghaiDayRange(new Date("2026-09-14T04:00:00.000Z"));
  assert.equal(start.toISOString(), "2026-09-13T16:00:00.000Z");
  assert.equal(endExclusive.toISOString(), "2026-09-14T16:00:00.000Z");
});

test("订单时间展示固定为上海时区", () => {
  assert.equal(formatOrderTime(new Date("2026-09-14T04:00:00.000Z")), "2026/09/14 12:00");
});
