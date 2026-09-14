import "server-only";

import { afterSaleRepository } from "@/server/repositories/after-sale-repository";
import { createAfterSaleService } from "@/server/services/after-sale-service";

export const afterSaleService = createAfterSaleService(afterSaleRepository);

