import { z } from "zod";

export const adminCategorySchema = z.object({
  name: z.string().trim().min(1, "分类名称不能为空").max(100, "分类名称不能超过 100 个字符"),
  slug: z.string().trim().min(1, "分类标识不能为空").max(120, "分类标识不能超过 120 个字符").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "分类标识只能包含小写字母、数字和连字符"),
  description: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(500, "分类描述不能超过 500 个字符").optional()),
  sortOrder: z.coerce.number().int("排序必须是整数").min(0, "排序不能小于 0"),
  status: z.enum(["ACTIVE", "HIDDEN"], "请选择有效分类状态"),
});
export type AdminCategoryInput = z.infer<typeof adminCategorySchema>;
export function parseAdminCategoryFormData(formData: FormData) {
  return adminCategorySchema.safeParse({ name: formData.get("name"), slug: formData.get("slug"), description: formData.get("description"), sortOrder: formData.get("sortOrder"), status: formData.get("status") });
}
