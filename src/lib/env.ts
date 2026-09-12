import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL 不能为空")
    .regex(/^mysql:\/\//, "DATABASE_URL 必须是 MySQL 连接地址"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
