import { z } from "zod";

export const catalogSorts = [
  "newest",
  "price_asc",
  "price_desc",
  "sales",
] as const;

export type CatalogSort = (typeof catalogSorts)[number];

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

const optionalPriceSchema = z.preprocess(
  (value) => {
    const first = firstValue(value);
    return first === undefined || first === "" ? null : first;
  },
  z.union([
    z.null(),
    z.coerce
      .number({ error: "价格必须是非负整数" })
      .int("价格必须是非负整数")
      .nonnegative("价格必须是非负整数"),
  ]),
);

const inStockSchema = z.preprocess(
  (value) => {
    const first = firstValue(value);
    return first === undefined || first === "" ? undefined : first;
  },
  z.literal("true").optional(),
).transform((value) => value === "true");

const catalogQuerySchema = z.object({
  search: z.preprocess(
    firstValue,
    z.string().trim().max(100, "搜索词不能超过 100 个字符").default(""),
  ),
  category: z.preprocess(
    firstValue,
    z.string().trim().max(120, "分类标识不能超过 120 个字符").default(""),
  ),
  minPrice: optionalPriceSchema,
  maxPrice: optionalPriceSchema,
  inStock: inStockSchema,
  sort: z.preprocess(
    firstValue,
    z.enum(catalogSorts, { error: "排序方式不正确" }).default("newest"),
  ),
  page: z.preprocess(firstValue, pageSchema),
}).refine(
  (value) =>
    value.minPrice === null ||
    value.maxPrice === null ||
    value.minPrice <= value.maxPrice,
  {
    message: "最低价格不能高于最高价格",
    path: ["maxPrice"],
  },
);

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export function parseCatalogQuery(input: Record<string, unknown>): CatalogQuery {
  return catalogQuerySchema.parse(input);
}

export type CatalogHrefInput = CatalogQuery;

export function buildCatalogHref(input: CatalogHrefInput) {
  const parameters = new URLSearchParams();

  if (input.search) parameters.set("search", input.search);
  if (input.category) parameters.set("category", input.category);
  if (input.minPrice !== null) parameters.set("minPrice", String(input.minPrice));
  if (input.maxPrice !== null) parameters.set("maxPrice", String(input.maxPrice));
  if (input.inStock) parameters.set("inStock", "true");
  if (input.sort !== "newest") parameters.set("sort", input.sort);
  if (input.page > 1) parameters.set("page", String(input.page));

  const query = parameters.toString();
  return query ? `/?${query}#catalog` : "/#catalog";
}
