// 验证客服只把商城已知站内路径变成可点击链接。
import assert from "node:assert/strict";
import test from "node:test";

import { splitSupportReplyLinks } from "./support-links";

test("商品、分类、会员和订单路径可以直接打开", () => {
  const parts = splitSupportReplyLinks("看 /products/stellar-phone，也可到 /?category=phones#catalog，会员在 /account，订单在 /orders");
  assert.deepEqual(parts.filter((part) => part.href).map((part) => part.href), [
    "/products/stellar-phone", "/?category=phones#catalog", "/account", "/orders",
  ]);
});

test("外站和未授权路径仍保持普通文本", () => {
  const parts = splitSupportReplyLinks("https://evil.example/ 和 /admin/users");
  assert.equal(parts.some((part) => part.href), false);
});
