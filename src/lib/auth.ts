import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { env } from "@/lib/env";

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
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
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
