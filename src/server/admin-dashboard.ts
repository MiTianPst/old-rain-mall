import "server-only";

import { adminDashboardRepository } from "@/server/repositories/admin-dashboard-repository";
import { createAdminDashboardService } from "@/server/services/admin-dashboard-service";

export const adminDashboardService = createAdminDashboardService(adminDashboardRepository);

