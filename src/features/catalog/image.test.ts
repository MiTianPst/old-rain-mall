import assert from "node:assert/strict";
import test from "node:test";

import { getLocalProductImage } from "./image";

test("商品图片只接受安全的站内绝对路径", () => {
  assert.equal(
    getLocalProductImage("/products/umbrella.jpg"),
    "/products/umbrella.jpg",
  );
  assert.equal(getLocalProductImage("//evil.example/image.jpg"), null);
  assert.equal(getLocalProductImage("/\\evil.example/image.jpg"), null);
  assert.equal(getLocalProductImage("https://example.com/image.jpg"), null);
  assert.equal(getLocalProductImage("/products/line\nbreak.jpg"), null);
  assert.equal(getLocalProductImage(null), null);
});
