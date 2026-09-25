import "server-only";

import { betterAuth } from "better-auth";
import { APIError } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db";
import { accounts, rateLimits, sessions, users, verifications } from "@/db/schema";
import { env } from "@/lib/env";
import { authRateLimitService } from "@/server/auth-rate-limit";
import { sendPasswordResetMail } from "@/server/email/password-reset-email";

export const auth = betterAuth({
  appName: "旧雨电商",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      rateLimit: rateLimits,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      if (!env.QQ_SMTP_USER || !env.QQ_SMTP_AUTH_CODE) {
        throw new Error("找回密码邮件尚未配置");
      }
      try {
        await sendPasswordResetMail({
          from: env.QQ_SMTP_USER,
          authorizationCode: env.QQ_SMTP_AUTH_CODE,
          to: user.email,
          resetUrl: url,
          siteUrl: env.BETTER_AUTH_URL,
        });
      } catch (error) {
        console.error("[auth] 找回密码邮件发送失败", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        throw new Error("找回密码邮件发送失败");
      }
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 900, max: 3 },
    },
  },
  hooks: {
    before: async (ctx) => {
      const hookContext = ctx as unknown as { path?: string; body?: unknown };
      const scope = hookContext.path === "/sign-in/email" ? "LOGIN" : hookContext.path === "/request-password-reset" ? "PASSWORD_RESET" : null;
      if (!scope) return;
      const body = hookContext.body as { email?: unknown } | undefined;
      if (typeof body?.email !== "string") return;
      const result = await authRateLimitService.consumeAccount({ scope, email: body.email });
      if (!result.allowed) throw new APIError("TOO_MANY_REQUESTS", { message: "请求过于频繁，请稍后再试" });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
      membershipLevel: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      lifetimePaidCents: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      membershipUpgradedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
});
