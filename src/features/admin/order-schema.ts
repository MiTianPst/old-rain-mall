import { z } from "zod";
import { orderStatuses } from "@/db/schema";
export const adminOrderQuerySchema = z.object({ search: z.string().trim().max(100).optional().catch(undefined), status: z.enum(orderStatuses).optional().catch(undefined), afterSaleStatus: z.enum(["REQUESTED", "APPROVED", "REJECTED", "REFUNDING", "REFUNDED"]).optional().catch(undefined), dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined), dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined), page: z.coerce.number().int().positive().catch(1) }).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, { path: ["dateTo"], message: "结束日期不能早于开始日期" });
export const adminOrderNoteSchema = z.object({ orderNo: z.string().min(8).max(32), note: z.string().trim().max(1000) });
export const adminOrderNoSchema = z.string().min(8, "订单号格式不正确").max(32, "订单号格式不正确").regex(/^[A-Z0-9]+$/, "订单号格式不正确");
export type AdminOrderStatus = (typeof orderStatuses)[number];
