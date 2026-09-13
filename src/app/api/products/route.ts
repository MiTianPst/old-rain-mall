import { createCatalogHttpHandlers } from "@/app/api/catalog-http";
import { catalogService } from "@/server/catalog";

const handlers = createCatalogHttpHandlers(catalogService);

export const GET = handlers.listProducts;
