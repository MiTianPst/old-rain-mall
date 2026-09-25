/** 找回密码邮件测试：验证重置链接、发件人和跨站链接拦截。 */
import assert from "node:assert/strict";
import test from "node:test";

import nodemailer from "nodemailer";

import { buildPasswordResetMail, sendPasswordResetMail } from "./password-reset-email";

test("找回密码邮件包含同站一次性链接和有效期", () => {
  const mail = buildPasswordResetMail({
    from: "2249087650@qq.com",
    to: "buyer@example.com",
    resetUrl: "http://localhost:3000/api/auth/reset-password/one-time-token?callbackURL=%2Freset-password",
    siteUrl: "http://localhost:3000",
  });

  assert.equal(mail.from, "旧雨电商 <2249087650@qq.com>");
  assert.equal(mail.to, "buyer@example.com");
  assert.match(String(mail.text), /一次性重置链接/);
  assert.match(String(mail.text), /1 小时/);
  assert.match(String(mail.text), /http:\/\/localhost:3000\/api\/auth\/reset-password\/one-time-token/);
});

test("找回密码邮件拒绝外站和非重置路径", () => {
  const base = { from: "2249087650@qq.com", to: "buyer@example.com", siteUrl: "http://localhost:3000" };
  assert.throws(() => buildPasswordResetMail({ ...base, resetUrl: "https://attacker.example/reset-password/token" }));
  assert.throws(() => buildPasswordResetMail({ ...base, resetUrl: "http://localhost:3000/other" }));
});

test("邮件内容可通过真实 Nodemailer 传输器交付", async () => {
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const result = await sendPasswordResetMail({
    from: "2249087650@qq.com",
    authorizationCode: "test-only-code",
    to: "buyer@example.com",
    resetUrl: "http://localhost:3000/api/auth/reset-password/one-time-token?callbackURL=%2Freset-password",
    siteUrl: "http://localhost:3000",
    transport,
  });
  const message = JSON.parse(String(result.message)) as { to: Array<{ address: string }>; text: string };
  assert.equal(message.to[0]?.address, "buyer@example.com");
  assert.match(message.text, /one-time-token/);
});
