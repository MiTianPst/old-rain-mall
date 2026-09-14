import { z } from "zod";

export const adminUserQuerySchema = z.object({
  search: z.string().trim().max(100).optional().catch(undefined),
  role: z.enum(["USER", "ADMIN"]).optional().catch(undefined),
  status: z.enum(["ACTIVE", "FROZEN"]).optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
});

export const adminUserStatusSchema = z.object({
  targetUserId: z.string().trim().min(1, "用户参数不正确").max(36),
  status: z.enum(["ACTIVE", "FROZEN"]),
});

