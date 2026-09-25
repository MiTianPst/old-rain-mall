// 验证首页商品轮播的首屏内容、详情链接与手动切换入口。
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { HomepageProductDto } from "@/server/services/homepage-service";
import { HomeHeroCarousel } from "./home-hero-carousel";

// 使用完整的首页商品数据检查真实商品链接，而非测试模拟按钮。
function product(id: number): HomepageProductDto {
  return {
    id, slug: `phone-${id}`, name: `手机 ${id}`, summary: "轻薄手机",
    priceCents: 599900, stock: 5, coverUrl: null,
    category: { id: 1, name: "手机", slug: "phones" },
    defaultVariantId: id, activeVariantCount: 1,
    compareAtPriceCents: null, promotionLabel: null, salesCount: 0,
    memberPriceCents: 599900,
  };
}

test("多件商品显示首件信息、详情链接和前后切换按钮", () => {
  const html = renderToStaticMarkup(createElement(HomeHeroCarousel, { products: [product(1), product(2)] }));
  assert.match(html, /手机 1/);
  assert.match(html, /\/products\/phone-1/);
  assert.match(html, /上一件商品/);
  assert.match(html, /下一件商品/);
});

test("只有一件商品时不显示无意义的轮播按钮", () => {
  const html = renderToStaticMarkup(createElement(HomeHeroCarousel, { products: [product(1)] }));
  assert.doesNotMatch(html, /上一件商品|下一件商品/);
});
