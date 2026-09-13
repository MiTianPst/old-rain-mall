import assert from "node:assert/strict";
import test from "node:test";

import { addressFormSchema } from "./schema";

test("地址要求完整收货信息并限制字段长度", () => {
  assert.equal(addressFormSchema.safeParse({}).success, false);
  assert.equal(
    addressFormSchema.safeParse({
      recipientName: "张三",
      recipientPhone: "13800138000",
      province: "浙江省",
      city: "杭州市",
      district: "西湖区",
      detailAddress: "文三路 1 号",
      label: "家",
    }).success,
    true,
  );
});
