import "server-only";

import { catalogRepository } from "./repositories/catalog-repository";
import { createCatalogService } from "./services/catalog-service";

export const catalogService = createCatalogService(catalogRepository);
