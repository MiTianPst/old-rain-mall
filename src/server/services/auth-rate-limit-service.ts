import { createHash } from "node:crypto";

import type { AuthRateLimitRepository } from "@/server/repositories/auth-rate-limit-repository";

export type AuthRateLimitScope = "LOGIN" | "PASSWORD_RESET";
const rules: Record<AuthRateLimitScope, { windowSeconds: number; max: number }> = { LOGIN: { windowSeconds: 60, max: 5 }, PASSWORD_RESET: { windowSeconds: 900, max: 3 } };

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

export function createAuthRateLimitService(repository: AuthRateLimitRepository) {
  return {
    async consumeAccount(input: { scope: AuthRateLimitScope; email: string; now?: Date }) {
      const email = normalizeEmail(input.email);
      const hash = createHash("sha256").update(email).digest("hex");
      const rule = rules[input.scope];
      return repository.consume({ key: `account:${input.scope.toLowerCase()}:${hash}`, ...rule, nowMs: (input.now ?? new Date()).getTime() });
    },
  };
}

