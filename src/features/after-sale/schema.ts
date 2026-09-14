import { z } from "zod";

import { orderNoSchema } from "@/features/shipping/schema";

export const afterSaleRequestSchema = z.object({
  orderNo: orderNoSchema,
  reason: z.string().trim().min(2, "请选择或填写售后原因").max(100),
  description: z.string().trim().min(5, "请补充至少 5 个字符的说明").max(1000),
});

export const afterSaleReviewSchema = z.object({
  afterSaleId: z.coerce.number().int().positive("售后编号不正确"),
  decision: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().trim().min(2, "请填写审核说明").max(1000),
});

export const afterSaleRefundSchema = z.object({
  afterSaleId: z.coerce.number().int().positive("售后编号不正确"),
});

