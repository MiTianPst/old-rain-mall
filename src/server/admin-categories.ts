import "server-only";
import { adminCategoryRepository } from "@/server/repositories/admin-category-repository";
import { createAdminCategoryService } from "@/server/services/admin-category-service";
export const adminCategoryService = createAdminCategoryService(adminCategoryRepository);
