import assert from "node:assert/strict";
import { createCipheriv } from "node:crypto";
import test from "node:test";

import { decryptWechatNotification } from "./wechat-native-provider";

test("微信支付回调可以解密通知资源", () => {
  const key = Buffer.alloc(32, 7);
  const nonce = "123456789012";
  const associatedData = "old-rain";
  const plaintext = JSON.stringify({
    out_trade_no: "OR202609130001",
    transaction_id: "420000000000000001",
    trade_state: "SUCCESS",
    amount: { total: 20000 },
  });
  const cipher = createCipheriv("aes-256-gcm", key, Buffer.from(nonce));
  cipher.setAAD(Buffer.from(associatedData));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]).toString("base64");

  const result = decryptWechatNotification({
    algorithm: "AEAD_AES_256_GCM",
    ciphertext,
    nonce,
    associated_data: associatedData,
  }, key.toString("utf8"));

  assert.deepEqual(result, JSON.parse(plaintext));
});
