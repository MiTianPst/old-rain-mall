import { z } from "zod";

export const addressFormSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, "请输入收货人姓名")
    .max(100, "收货人姓名不能超过 100 个字符"),
  recipientPhone: z.string().trim().regex(/^1\d{10}$/, "请输入正确的手机号"),
  province: z
    .string()
    .trim()
    .min(1, "请输入省份")
    .max(100, "省份不能超过 100 个字符"),
  city: z
    .string()
    .trim()
    .min(1, "请输入城市")
    .max(100, "城市不能超过 100 个字符"),
  district: z
    .string()
    .trim()
    .min(1, "请输入区县")
    .max(100, "区县不能超过 100 个字符"),
  detailAddress: z
    .string()
    .trim()
    .min(2, "请输入详细地址")
    .max(500, "详细地址不能超过 500 个字符"),
  label: z
    .string()
    .trim()
    .max(50, "地址标签不能超过 50 个字符")
    .optional()
    .transform((value) => value || undefined),
});

export type AddressInput = z.infer<typeof addressFormSchema>;
