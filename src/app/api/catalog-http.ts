import { z } from "zod";

import { parseCatalogQuery } from "@/features/catalog/query";
import type { CatalogService } from "@/server/services/catalog-service";

const productIdSchema = z.coerce
  .number({ error: "商品 ID 必须是正整数" })
  .int("商品 ID 必须是正整数")
  .positive("商品 ID 必须是正整数");

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

type CatalogHttpOptions = {
  reportError?: (context: string, error: unknown) => void;
};

function defaultReportError(context: string, error: unknown) {
  console.error(`[catalog-api] ${context}`, {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
}

export function createCatalogHttpHandlers(
  service: CatalogService,
  options: CatalogHttpOptions = {},
) {
  const reportError = options.reportError ?? defaultReportError;

  function internalError(context: string, error: unknown) {
    reportError(context, error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "服务暂时不可用，请稍后重试",
    );
  }

  return {
    async listProducts(request: Request) {
      try {
        const url = new URL(request.url);
        const query = parseCatalogQuery(Object.fromEntries(url.searchParams));
        return Response.json(await service.listProducts(query));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return errorResponse(
            400,
            "INVALID_QUERY",
            error.issues[0]?.message ?? "查询参数不正确",
          );
        }
        return internalError("list-products", error);
      }
    },

    async getProduct(
      _request: Request,
      context: { params: Promise<{ id: string }> },
    ) {
      try {
        const { id: rawId } = await context.params;
        const parsedId = productIdSchema.safeParse(rawId);

        if (!parsedId.success) {
          return errorResponse(400, "INVALID_ID", "商品 ID 必须是正整数");
        }

        const product = await service.getProductById(parsedId.data);
        if (!product) {
          return errorResponse(
            404,
            "PRODUCT_NOT_FOUND",
            "商品不存在或已下架",
          );
        }

        return Response.json({ data: product });
      } catch (error) {
        return internalError("get-product", error);
      }
    },

    async listCategories() {
      try {
        return Response.json({ data: await service.listCategories() });
      } catch (error) {
        return internalError("list-categories", error);
      }
    },
  };
}
