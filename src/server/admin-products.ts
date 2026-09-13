import "server-only";
import { adminProductRepository } from "@/server/repositories/admin-product-repository";
import { createAdminProductService } from "@/server/services/admin-product-service";
export const adminProductService = createAdminProductService(adminProductRepository);
