import { createCatalogHttpHandlers } from "@/app/api/catalog-http";
import { catalogService } from "@/server/catalog";

const handlers = createCatalogHttpHandlers(catalogService);

export async function GET(
  request: Request,
  context: RouteContext<"/api/products/[id]">,
) {
  return handlers.getProduct(request, context);
}
