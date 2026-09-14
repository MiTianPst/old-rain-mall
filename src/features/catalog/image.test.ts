import assert from "node:assert/strict";
import test from "node:test";

import { getProductImageUrl } from "./image";

test("商品图片只接受安全的站内路径或 Unsplash 直链", () => {
  assert.equal(
    getProductImageUrl("/products/umbrella.jpg"),
    "/products/umbrella.jpg",
  );
  assert.equal(
    getProductImageUrl("https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=85"),
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=85",
  );
  assert.equal(getProductImageUrl("//evil.example/image.jpg"), null);
  assert.equal(getProductImageUrl("/\\evil.example/image.jpg"), null);
  assert.equal(getProductImageUrl("https://example.com/image.jpg"), null);
  assert.equal(getProductImageUrl("http://images.unsplash.com/image.jpg"), null);
  assert.equal(getProductImageUrl("/products/line\nbreak.jpg"), null);
  assert.equal(getProductImageUrl(null), null);
});
