import { z } from "zod";

export const addressFormSchema = z.object({
  recipientName: z.string().trim().min(2, "请输入收货人姓名").max(100),
  recipientPhone: z.string().trim().regex(/^1\d{10}$/, "请输入正确的手机号"),
  province: z.string().trim().min(1, "请输入省份").max(100),
  city: z.string().trim().min(1, "请输入城市").max(100),
  district: z.string().trim().min(1, "请输入区县").max(100),
  detailAddress: z.string().trim().min(2, "请输入详细地址").max(500),
  label: z.string().trim().max(50).optional().transform((value) => value || undefined),
});

export type AddressInput = z.infer<typeof addressFormSchema>;
