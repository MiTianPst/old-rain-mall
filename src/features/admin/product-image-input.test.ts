// 验证新增商品表单对本地图片的选择和大小、格式校验。
import assert from "node:assert/strict";
import test from "node:test";

import { parseOptionalProductImage } from "./product-image-input";

test("未选择图片时允许先保存商品", () => {
  assert.deepEqual(parseOptionalProductImage(null), { ok: true, file: null });
  assert.deepEqual(parseOptionalProductImage(new File([], "", { type: "application/octet-stream" })), { ok: true, file: null });
});

test("接受本地图片并拒绝无效图片", () => {
  const image = new File(["image"], "cover.png", { type: "image/png" });
  assert.deepEqual(parseOptionalProductImage(image), { ok: true, file: image });
  assert.equal(parseOptionalProductImage(new File(["text"], "a.txt", { type: "text/plain" })).ok, false);
  assert.equal(parseOptionalProductImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })).ok, false);
  assert.equal(parseOptionalProductImage("not-a-file").ok, false);
});
