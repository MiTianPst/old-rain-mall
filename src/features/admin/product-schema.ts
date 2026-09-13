import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (value) => (value === null || (typeof value === "string" && value.trim() === "") ? undefined : value),
    z.string().trim().max(max, message).optional(),
  );

export function yuanToCents(value: string) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [yuan = "0", fraction = ""] = normalized.split(".");
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

const adminProductFormSchema = z.object({
  categoryId: z.coerce.number().int("请选择商品分类").positive("请选择商品分类"),
  name: z.string().trim().min(1, "商品名称不能为空").max(200, "商品名称不能超过 200 个字符"),
  slug: z.string().trim().min(1, "商品标识不能为空").max(220, "商品标识不能超过 220 个字符").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "商品标识只能包含小写字母、数字和连字符"),
  summary: optionalText(500, "商品摘要不能超过 500 个字符"),
  description: z.preprocess((value) => (value === null || (typeof value === "string" && value.trim() === "") ? undefined : value), z.string().trim().optional()),
  priceYuan: z.string().trim().refine((value) => yuanToCents(value) !== null, "请输入最多两位小数的有效价格"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"], "请选择有效商品状态"),
  coverUrl: z.preprocess((value) => (value === null || (typeof value === "string" && value.trim() === "") ? undefined : value), z.url("封面地址格式不正确").max(1000, "封面地址不能超过 1000 个字符").optional()),
});

export type AdminProductInput = {
  categoryId: number;
  name: string;
  slug: string;
  summary?: string;
  description?: string;
  priceCents: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  coverUrl?: string;
};

export function parseAdminProductFormData(formData: FormData) {
  const result = adminProductFormSchema.safeParse({
    categoryId: formData.get("categoryId"), name: formData.get("name"), slug: formData.get("slug"),
    summary: formData.get("summary"), description: formData.get("description"), priceYuan: formData.get("priceYuan"),
    status: formData.get("status"), coverUrl: formData.get("coverUrl"),
  });
  if (!result.success) return { success: false as const, fieldErrors: result.error.flatten().fieldErrors };
  return {
    success: true as const,
    data: {
      categoryId: result.data.categoryId, name: result.data.name, slug: result.data.slug,
      summary: result.data.summary, description: result.data.description,
      priceCents: yuanToCents(result.data.priceYuan)!,
      status: result.data.status, coverUrl: result.data.coverUrl,
    } satisfies AdminProductInput,
  };
}

const attributeSchema = z.record(
  z.string().trim().min(1, "规格名称不能为空").max(50, "规格名称不能超过 50 个字符"),
  z.string().trim().min(1, "规格值不能为空").max(200, "规格值不能超过 200 个字符"),
).refine((attributes) => Object.keys(attributes).length <= 20, "每个 SKU 最多包含 20 个规格");

export const adminVariantSchema = z.object({
  id: z.number().int().positive().optional(),
  skuCode: z.string().trim().min(1, "SKU 编码不能为空").max(255, "SKU 编码不能超过 255 个字符")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "SKU 编码只能包含字母、数字、点、下划线和连字符"),
  name: z.string().trim().min(1, "规格名称不能为空").max(200, "规格名称不能超过 200 个字符"),
  attributes: attributeSchema,
  priceYuan: z.string().trim().refine((value) => yuanToCents(value) !== null, "请输入最多两位小数的有效价格"),
  stock: z.number().int("库存必须是整数").min(0, "库存不能小于 0"),
  status: z.enum(["ACTIVE", "ARCHIVED"], "请选择有效 SKU 状态"),
});

export const adminVariantsSchema = z.array(adminVariantSchema).max(100, "每个商品最多包含 100 个 SKU");

export type AdminVariantInput = z.infer<typeof adminVariantSchema>;

export function parseAdminVariants(value: string) {
  try {
    const parsedJson: unknown = JSON.parse(value);
    const result = adminVariantsSchema.safeParse(parsedJson);
    if (result.success) return { success: true as const, data: result.data };
    return {
      success: false as const,
      fieldErrors: {
        variants: [result.error.issues[0]?.message ?? "请检查 SKU 信息"],
      },
    };
  } catch {
    return { success: false as const, fieldErrors: { variants: ["SKU 数据格式不正确"] } };
  }
}

export function parsePositiveInteger(value: FormDataEntryValue | null) {
  const parsed = z.coerce.number().int().positive().safeParse(value);
  return parsed.success ? parsed.data : null;
}
