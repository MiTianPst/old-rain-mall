import assert from "node:assert/strict";
import test from "node:test";

import { loginSchema, registerSchema, safeNextPath } from "./schema";

test("注册要求中文可读的姓名、合法邮箱和至少 8 位密码", () => {
  assert.equal(
    registerSchema.safeParse({
      name: "雨客",
      email: "rain@example.com",
      password: "rain1234",
    }).success,
    true,
  );

  const result = registerSchema.safeParse({
    name: "",
    email: "bad-email",
    password: "123",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.flatten().fieldErrors, {
      name: ["请输入姓名"],
      email: ["请输入有效的邮箱地址"],
      password: ["密码至少需要 8 位"],
    });
  }
});

test("登录表单校验邮箱和密码", () => {
  assert.equal(
    loginSchema.safeParse({ email: "rain@example.com", password: "12345678" })
      .success,
    true,
  );
  assert.equal(
    loginSchema.safeParse({ email: "rain", password: "" }).success,
    false,
  );
});

test("回跳地址只允许站内绝对路径", () => {
  assert.equal(safeNextPath("/products/umbrella"), "/products/umbrella");
  assert.equal(safeNextPath("https://evil.example"), "/");
  assert.equal(safeNextPath("//evil.example/path"), "/");
  assert.equal(safeNextPath("/\\evil.example/path"), "/");
  assert.equal(safeNextPath(undefined), "/");
});
