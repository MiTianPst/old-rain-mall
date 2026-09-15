import { z } from "zod";

export const orderAddressSchema = z.object({
  addressId: z.coerce.number().int().positive(),
});

const buyNowVariantIdSchema = z.preprocess(
  (value) => (value === undefined || value === null || value === "" ? undefined : value),
  z.coerce.number({ error: "商品规格参数不正确" }).int("商品规格参数不正确").positive("商品规格参数不正确").optional(),
);

export const orderNoSchema = z
  .string()
  .min(8, "订单号格式不正确")
  .max(32, "订单号格式不正确")
  .regex(/^[A-Z0-9]+$/, "订单号格式不正确");

export const createOrderSchema = orderAddressSchema.extend({
  buyNowVariantId: buyNowVariantIdSchema,
});
export const getOrderSchema = z.object({ orderNo: orderNoSchema });
export const cancelOrderSchema = getOrderSchema;

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderNoInput = z.infer<typeof orderNoSchema>;
