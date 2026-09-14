import { z } from "zod";

export const orderNoSchema = z.string().trim().min(8, "订单号格式不正确").max(32, "订单号格式不正确").regex(/^[A-Z0-9]+$/, "订单号格式不正确");

export const createShipmentSchema = z.object({
  orderNo: orderNoSchema,
  carrier: z.string().trim().min(2, "请填写物流公司").max(100, "物流公司不能超过 100 个字符"),
  trackingNo: z.string().trim().min(4, "请填写正确的物流单号").max(100, "物流单号不能超过 100 个字符").regex(/^[A-Za-z0-9-]+$/, "物流单号格式不正确"),
});

export const advanceShipmentSchema = z.object({
  orderNo: orderNoSchema,
  targetStatus: z.enum(["IN_TRANSIT", "DELIVERED"]),
});

