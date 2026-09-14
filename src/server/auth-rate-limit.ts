import "server-only";

import { authRateLimitRepository } from "@/server/repositories/auth-rate-limit-repository";
import { createAuthRateLimitService } from "@/server/services/auth-rate-limit-service";

export const authRateLimitService = createAuthRateLimitService(authRateLimitRepository);

