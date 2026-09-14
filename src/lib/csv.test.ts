import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeCsv } from "@/lib/csv";

test("CSV 使用 UTF-8 BOM、RFC 4180 转义并防止公式注入", () => {
  assert.equal(
    encodeCsv(["订单号", "备注"], [["=1+1", '包含,逗号和"引号"']]),
    '\uFEFF订单号,备注\r\n"\'=1+1","包含,逗号和""引号"""\r\n',
  );
});

test("CSV 将 null 编码为空单元格", () => {
  assert.equal(encodeCsv(["A", "B"], [[null, "文本"]]), "\uFEFFA,B\r\n,文本\r\n");
});
