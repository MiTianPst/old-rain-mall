import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.url().optional(),
);

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL 不能为空")
    .regex(/^mysql:\/\//, "DATABASE_URL 必须是 MySQL 连接地址"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET 至少需要 32 个字符"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL 必须是有效地址"),
  ORDER_EXPIRATION_JOB_SECRET: z.string().min(32, "订单过期任务密钥至少需要 32 个字符").optional(),
  PAYMENT_PROVIDER: z.enum(["MOCK", "WECHAT_NATIVE"]).default("MOCK"),
  WECHAT_APP_ID: optionalString,
  WECHAT_MCH_ID: optionalString,
  WECHAT_SERIAL_NO: optionalString,
  WECHAT_PRIVATE_KEY: optionalString,
  WECHAT_PLATFORM_CERTIFICATE: optionalString,
  WECHAT_API_V3_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().length(32, "WECHAT_API_V3_KEY 必须是 32 个字符").optional(),
  ),
  WECHAT_NOTIFY_URL: optionalUrl,
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  ORDER_EXPIRATION_JOB_SECRET: process.env.ORDER_EXPIRATION_JOB_SECRET,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  WECHAT_APP_ID: process.env.WECHAT_APP_ID,
  WECHAT_MCH_ID: process.env.WECHAT_MCH_ID,
  WECHAT_SERIAL_NO: process.env.WECHAT_SERIAL_NO,
  WECHAT_PRIVATE_KEY: process.env.WECHAT_PRIVATE_KEY,
  WECHAT_PLATFORM_CERTIFICATE: process.env.WECHAT_PLATFORM_CERTIFICATE,
  WECHAT_API_V3_KEY: process.env.WECHAT_API_V3_KEY,
  WECHAT_NOTIFY_URL: process.env.WECHAT_NOTIFY_URL,
});
