import "server-only";

import { inventoryRepository } from "@/server/repositories/inventory-repository";
import { createInventoryService } from "@/server/services/inventory-service";

export const inventoryService = createInventoryService(inventoryRepository);
