import assert from "node:assert/strict";
import test from "node:test";

import { buildCatalogHref, parseCatalogQuery } from "./query";

test("缺省查询使用第一页并清理空筛选", () => {
  assert.deepEqual(parseCatalogQuery({}), {
    search: "",
    category: "",
    minPrice: null,
    maxPrice: null,
    inStock: false,
    sort: "newest",
    page: 1,
  });
});

test("查询参数会去除首尾空格并解析正整数页码", () => {
  assert.deepEqual(
    parseCatalogQuery({
      search: "  雨伞  ",
      category: "  daily-goods ",
      page: "3",
    }),
    {
      search: "雨伞",
      category: "daily-goods",
      minPrice: null,
      maxPrice: null,
      inStock: false,
      sort: "newest",
      page: 3,
    },
  );
});

test("非法页码会返回可识别的校验错误", () => {
  assert.throws(
    () => parseCatalogQuery({ page: "0" }),
    /页码必须是大于 0 的整数/,
  );
  assert.throws(
    () => parseCatalogQuery({ page: "1.5" }),
    /页码必须是大于 0 的整数/,
  );
});

test("分页链接保留筛选并省略空参数", () => {
  assert.equal(
    buildCatalogHref({
      search: "雨 伞",
      category: "travel",
      minPrice: null,
      maxPrice: null,
      inStock: false,
      sort: "newest",
      page: 2,
    }),
    "/?search=%E9%9B%A8+%E4%BC%9E&category=travel&page=2#catalog",
  );
  assert.equal(
    buildCatalogHref({
      search: "",
      category: "",
      minPrice: null,
      maxPrice: null,
      inStock: false,
      sort: "newest",
      page: 1,
    }),
    "/#catalog",
  );
});

test("解析价格库存排序并保留分页参数", () => {
  const query = parseCatalogQuery({
    minPrice: "1000",
    maxPrice: "5000",
    inStock: "true",
    sort: "price_asc",
    page: "2",
  });

  assert.deepEqual(query, {
    search: "",
    category: "",
    minPrice: 1000,
    maxPrice: 5000,
    inStock: true,
    sort: "price_asc",
    page: 2,
  });
  assert.equal(
    buildCatalogHref(query),
    "/?minPrice=1000&maxPrice=5000&inStock=true&sort=price_asc&page=2#catalog",
  );
});

test("拒绝倒置价格区间和未知排序", () => {
  assert.throws(
    () => parseCatalogQuery({ minPrice: "5000", maxPrice: "1000" }),
    /最低价格不能高于最高价格/,
  );
  assert.throws(
    () => parseCatalogQuery({ sort: "random" }),
    /排序方式不正确/,
  );
});
