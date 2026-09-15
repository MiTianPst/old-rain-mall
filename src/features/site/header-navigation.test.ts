import assert from "node:assert/strict";
import test from "node:test";

import { buildHeaderCategoryLinks } from "./header-navigation";

test("顶部分类导航生成可直接筛选首页商品的链接", () => {
  const links = buildHeaderCategoryLinks([
    { id: 1, name: "手机数码", slug: "mobile & digital", description: null, productCount: 6 },
    { id: 2, name: "电脑办公", slug: "computers", description: null, productCount: 4 },
  ]);

  assert.deepEqual(links, [
    { id: 1, label: "手机数码", href: "/?category=mobile%20%26%20digital#catalog", productCount: 6 },
    { id: 2, label: "电脑办公", href: "/?category=computers#catalog", productCount: 4 },
  ]);
});

test("顶部分类导航最多展示五个分类，避免挤压操作区", () => {
  const links = buildHeaderCategoryLinks(
    Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      name: `分类${index + 1}`,
      slug: `category-${index + 1}`,
      description: null,
      productCount: index,
    })),
  );

  assert.equal(links.length, 5);
});
