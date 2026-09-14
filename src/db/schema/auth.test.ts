import assert from "node:assert/strict";
import test from "node:test";

import { rateLimits } from "./auth";

test("Better Auth 速率限制记录使用字符串主键", () => {
  assert.equal(rateLimits.id.getSQLType(), "varchar(36)");
});
