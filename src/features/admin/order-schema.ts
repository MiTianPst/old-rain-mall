import { z } from "zod";
import { orderStatuses } from "@/db/schema";
export const adminOrderQuerySchema = z.object({ search: z.string().trim().max(100).optional().catch(undefined), status: z.enum(orderStatuses).optional().catch(undefined), page: z.coerce.number().int().positive().catch(1) });
export const adminOrderNoSchema = z.string().min(8, "订单号格式不正确").max(32, "订单号格式不正确").regex(/^[A-Z0-9]+$/, "订单号格式不正确");
export type AdminOrderStatus = (typeof orderStatuses)[number];
