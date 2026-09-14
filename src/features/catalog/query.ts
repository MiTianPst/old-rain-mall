import { z } from "zod";

const pageSchema = z.preprocess(
  (value) => (value === undefined || value === "" ? 1 : value),
  z.coerce
    .number({ error: "页码必须是大于 0 的整数" })
    .int("页码必须是大于 0 的整数")
    .positive("页码必须是大于 0 的整数"),
);

function firstValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

const catalogQuerySchema = z.object({
  search: z.preprocess(
    firstValue,
    z.string().trim().max(100, "搜索词不能超过 100 个字符").default(""),
  ),
  category: z.preprocess(
    firstValue,
    z.string().trim().max(120, "分类标识不能超过 120 个字符").default(""),
  ),
  page: z.preprocess(firstValue, pageSchema),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export function parseCatalogQuery(input: Record<string, unknown>): CatalogQuery {
  return catalogQuerySchema.parse(input);
}

export type CatalogHrefInput = CatalogQuery;

export function buildCatalogHref(input: CatalogHrefInput) {
  const parameters = new URLSearchParams();

  if (input.search) parameters.set("search", input.search);
  if (input.category) parameters.set("category", input.category);
  if (input.page > 1) parameters.set("page", String(input.page));

  const query = parameters.toString();
  return query ? `/?${query}#catalog` : "/#catalog";
}
