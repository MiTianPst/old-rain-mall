import assert from "node:assert/strict";
import test from "node:test";

import { buildCatalogHref, parseCatalogQuery } from "./query";

test("缺省查询使用第一页并清理空筛选", () => {
  assert.deepEqual(parseCatalogQuery({}), {
    search: "",
    category: "",
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
    { search: "雨伞", category: "daily-goods", page: 3 },
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
    buildCatalogHref({ search: "雨 伞", category: "travel", page: 2 }),
    "/?search=%E9%9B%A8+%E4%BC%9E&category=travel&page=2",
  );
  assert.equal(buildCatalogHref({ search: "", category: "", page: 1 }), "/");
});
