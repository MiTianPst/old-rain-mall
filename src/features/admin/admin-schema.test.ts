import assert from "node:assert/strict";
import test from "node:test";

import { adminCategorySchema } from "./category-schema";
import {
  adminVariantsSchema,
  parseAdminProductFormData,
  yuanToCents,
} from "./product-schema";

function validProductFormData() {
  const formData = new FormData();
  Object.entries({
    categoryId: "1",
    name: "测试商品",
    slug: "test-product",
    priceYuan: "199.00",
    status: "ACTIVE",
    featuredSort: "0",
  }).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

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
    assert.equal("stock" in result.data, false);
  }
});

test("商品运营字段拒绝不高于现价的划线价", () => {
  const formData = validProductFormData();
  formData.set("compareAtPriceYuan", "199.00");

  const result = parseAdminProductFormData(formData);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.fieldErrors.compareAtPriceYuan?.[0],
      "商品原价必须高于当前价格",
    );
  }
});

test("商品运营字段拒绝负推荐顺序", () => {
  const formData = validProductFormData();
  formData.set("featuredSort", "-1");

  const result = parseAdminProductFormData(formData);

  assert.equal(result.success, false);
});

test("商品运营字段归一化空值并读取推荐开关", () => {
  const formData = validProductFormData();
  formData.set("compareAtPriceYuan", "");
  formData.set("promotionLabel", "");
  formData.set("isFeatured", "on");

  const result = parseAdminProductFormData(formData);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.compareAtPriceCents, undefined);
    assert.equal(result.data.promotionLabel, undefined);
    assert.equal(result.data.isFeatured, true);
    assert.equal(result.data.featuredSort, 0);
  }
});

test("SKU 输入校验编码、价格、库存和规格键值", () => {
  const valid = {
    skuCode: "TEA-RED_L",
    name: "红色 / 大号",
    attributes: { 颜色: "红色", 尺寸: "L" },
    priceYuan: "19.90",
    stock: 5,
    status: "ACTIVE" as const,
  };

  assert.equal(adminVariantsSchema.safeParse([valid]).success, true);
  assert.equal(adminVariantsSchema.safeParse([{ ...valid, skuCode: "空 格" }]).success, false);
  assert.equal(adminVariantsSchema.safeParse([{ ...valid, priceYuan: "19.999" }]).success, false);
  assert.equal(adminVariantsSchema.safeParse([{ ...valid, stock: -1 }]).success, false);
  assert.equal(adminVariantsSchema.safeParse([{ ...valid, attributes: { ["键".repeat(51)]: "值" } }]).success, false);
  assert.equal(adminVariantsSchema.safeParse([{ ...valid, attributes: { 颜色: "值".repeat(201) } }]).success, false);
});

test("分类只接受非负排序和真实状态枚举", () => {
  assert.equal(adminCategorySchema.safeParse({ name: "茶具", slug: "tea-tools", sortOrder: 0, status: "ACTIVE" }).success, true);
  assert.equal(adminCategorySchema.safeParse({ name: "茶具", slug: "tea-tools", sortOrder: -1, status: "ACTIVE" }).success, false);
  assert.equal(adminCategorySchema.safeParse({ name: "茶具", slug: "tea-tools", sortOrder: 0, status: "DELETED" }).success, false);
});
