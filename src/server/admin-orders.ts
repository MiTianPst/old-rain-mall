import "server-only";
import { adminOrderRepository } from "@/server/repositories/admin-order-repository";
import { createAdminOrderService } from "@/server/services/admin-order-service";
export const adminOrderService = createAdminOrderService(adminOrderRepository);
