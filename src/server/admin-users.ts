import "server-only";

import { adminUserRepository } from "@/server/repositories/admin-user-repository";
import { createAdminUserService } from "@/server/services/admin-user-service";

export const adminUserService = createAdminUserService(adminUserRepository);

