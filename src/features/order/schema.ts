import { z } from "zod";

export const orderAddressSchema = z.object({
  addressId: z.coerce.number().int().positive(),
});

export const orderNoSchema = z
  .string()
  .min(8, "订单号格式不正确")
  .max(32, "订单号格式不正确")
  .regex(/^[A-Z0-9]+$/, "订单号格式不正确");

export const createOrderSchema = orderAddressSchema;
export const getOrderSchema = z.object({ orderNo: orderNoSchema });
export const cancelOrderSchema = getOrderSchema;

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderNoInput = z.infer<typeof orderNoSchema>;
