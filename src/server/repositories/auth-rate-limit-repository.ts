import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { rateLimits } from "@/db/schema";

export type AuthRateLimitRepository = {
  consume(input: { key: string; windowSeconds: number; max: number; nowMs: number }): Promise<{ allowed: boolean; retryAfter: number }>;
};

export const authRateLimitRepository: AuthRateLimitRepository = {
  async consume(input) {
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(rateLimits).where(eq(rateLimits.key, input.key)).limit(1).for("update");
      const windowMs = input.windowSeconds * 1000;
      if (!row || input.nowMs - row.lastRequest >= windowMs) {
        await tx.insert(rateLimits).values({ key: input.key, count: 1, lastRequest: input.nowMs }).onDuplicateKeyUpdate({ set: { count: 1, lastRequest: input.nowMs } });
        return { allowed: true, retryAfter: input.windowSeconds };
      }
      if (row.count >= input.max) return { allowed: false, retryAfter: Math.max(1, Math.ceil((windowMs - (input.nowMs - row.lastRequest)) / 1000)) };
      await tx.update(rateLimits).set({ count: row.count + 1, lastRequest: input.nowMs }).where(eq(rateLimits.key, input.key));
      return { allowed: true, retryAfter: Math.max(1, Math.ceil((windowMs - (input.nowMs - row.lastRequest)) / 1000)) };
    });
  },
};

