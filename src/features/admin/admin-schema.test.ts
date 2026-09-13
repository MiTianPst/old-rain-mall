import assert from "node:assert/strict";
import test from "node:test";

import { adminCategorySchema } from "./category-schema";
import { parseAdminProductFormData, yuanToCents } from "./product-schema";

test("商品价格严格转换为整数分", () => {
  assert.equal(yuanToCents("98"), 9800);
  assert.equal(yuanToCents("98.5"), 9850);
  assert.equal(yuanToCents("98.05"), 9805);
  assert.equal(yuanToCents("98.005"), null);
  assert.equal(yuanToCents("-1"), null);
});

test("商品表单只输出白名单字段和整数分", () => {
  const formData = new FormData();
  Object.entries({ categoryId: "1", name: "测试商品", slug: "test-product", priceYuan: "19.90", stock: "5", status: "ACTIVE", role: "ADMIN" }).forEach(([key, value]) => formData.set(key, value));
  const result = parseAdminProductFormData(formData);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.priceCents, 1990);
    assert.equal("role" in result.data, false);
  }
});

test("分类只接受非负排序和真实状态枚举", () => {
  assert.equal(adminCategorySchema.safeParse({ name: "茶具", slug: "tea-tools", sortOrder: 0, status: "ACTIVE" }).success, true);
  assert.equal(adminCategorySchema.safeParse({ name: "茶具", slug: "tea-tools", sortOrder: -1, status: "ACTIVE" }).success, false);
  assert.equal(adminCategorySchema.safeParse({ name: "茶具", slug: "tea-tools", sortOrder: 0, status: "DELETED" }).success, false);
});
