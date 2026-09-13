import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL 不能为空")
    .regex(/^mysql:\/\//, "DATABASE_URL 必须是 MySQL 连接地址"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET 至少需要 32 个字符"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL 必须是有效地址"),
  ORDER_EXPIRATION_JOB_SECRET: z.string().min(32, "订单过期任务密钥至少需要 32 个字符").optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  ORDER_EXPIRATION_JOB_SECRET: process.env.ORDER_EXPIRATION_JOB_SECRET,
});
