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
  stock: z.coerce.number().int("库存必须是整数").min(0, "库存不能小于 0"),
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
  stock: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  coverUrl?: string;
};

export function parseAdminProductFormData(formData: FormData) {
  const result = adminProductFormSchema.safeParse({
    categoryId: formData.get("categoryId"), name: formData.get("name"), slug: formData.get("slug"),
    summary: formData.get("summary"), description: formData.get("description"), priceYuan: formData.get("priceYuan"),
    stock: formData.get("stock"), status: formData.get("status"), coverUrl: formData.get("coverUrl"),
  });
  if (!result.success) return { success: false as const, fieldErrors: result.error.flatten().fieldErrors };
  return {
    success: true as const,
    data: {
      categoryId: result.data.categoryId, name: result.data.name, slug: result.data.slug,
      summary: result.data.summary, description: result.data.description,
      priceCents: yuanToCents(result.data.priceYuan)!, stock: result.data.stock,
      status: result.data.status, coverUrl: result.data.coverUrl,
    } satisfies AdminProductInput,
  };
}

export function parsePositiveInteger(value: FormDataEntryValue | null) {
  const parsed = z.coerce.number().int().positive().safeParse(value);
  return parsed.success ? parsed.data : null;
}
