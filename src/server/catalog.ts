import "server-only";

import { catalogRepository, findDefaultActiveVariant } from "./repositories/catalog-repository";
import { createCatalogService } from "./services/catalog-service";

export const catalogService = {
  ...createCatalogService(catalogRepository),
  getDefaultActiveVariant: findDefaultActiveVariant,
};
