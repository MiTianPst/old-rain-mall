/** 公开 AI 客服接口：校验临时会话、限制请求频率并在服务端调用 DeepSeek。 */
import { createHash } from "node:crypto";

import { z } from "zod";

import { parseCatalogQuery } from "@/features/catalog/query";
import { parseSupportChatInput, supportSearchText } from "@/features/support/chat-schema";
import { buildShopContext, selectRelevantShopProducts, supportCatalogPages } from "@/features/support/shop-context";
import { env } from "@/lib/env";
import { catalogService } from "@/server/catalog";
import { authRateLimitRepository } from "@/server/repositories/auth-rate-limit-repository";
import { requestCustomerSupportReply } from "@/server/services/customer-support-service";

export const runtime = "nodejs";

const MAX_BODY_LENGTH = 20_000;

/** 返回统一的中文错误结构，避免将第三方或数据库错误暴露给浏览器。 */
function errorResponse(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** 使用客户端地址的哈希作为限流键，不在数据库保存原始 IP。 */
function rateLimitKey(request: Request) {
  const address = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  return `support:${createHash("sha256").update(address).digest("hex")}`;
}

/** 从公开目录收集候选，再按当前问题筛选；不将个人订单或账户数据交给模型。 */
async function loadShopContext(question: string, productSlug?: string) {
  const [categories, firstPage, focusedProduct] = await Promise.all([
    catalogService.listCategories(),
    catalogService.listProducts(parseCatalogQuery({ page: 1 })),
    productSlug ? catalogService.getProductBySlug(productSlug) : Promise.resolve(null),
  ]);
  const otherPages = await Promise.all(
    supportCatalogPages(firstPage.pagination.totalPages)
      .map((page) => catalogService.listProducts(parseCatalogQuery({ page }))),
  );
  const products = [focusedProduct, ...firstPage.data, ...otherPages.flatMap((page) => page.data)]
    .filter((product) => product !== null);
  const uniqueProducts = [...new Map(products.map((product) => [product.slug, product])).values()];
  return buildShopContext({
    categories,
    products: selectRelevantShopProducts(uniqueProducts.map((product) => ({
      name: product.name,
      slug: product.slug,
      summary: product.summary,
      priceCents: product.priceCents,
      stock: product.stock,
      categoryName: product.category.name,
      ...(focusedProduct?.slug === product.slug ? {
        description: focusedProduct.description,
        variants: focusedProduct.variants?.filter((variant) => variant.status === "ACTIVE")
          .map((variant) => ({ name: variant.name, priceCents: variant.priceCents, stock: variant.stock, attributes: variant.attributes })),
      } : {}),
    })), question, productSlug),
  });
}

/** 处理一轮对话；未配置密钥时明确提示，不会将密钥下发到客户端。 */
export async function POST(request: Request) {
  if (!env.DEEPSEEK_API_KEY) {
    return errorResponse(503, "AI 客服暂未启用，请稍后再试。");
  }

  let input;
  try {
    if (Number(request.headers.get("content-length")) > MAX_BODY_LENGTH) {
      return errorResponse(413, "消息太长，请缩短后重试。");
    }
    const body = await request.text();
    if (body.length > MAX_BODY_LENGTH) {
      return errorResponse(413, "消息太长，请缩短后重试。");
    }
    input = parseSupportChatInput(JSON.parse(body) as unknown);
  } catch (error) {
    return errorResponse(400, error instanceof z.ZodError ? "消息格式不正确，请缩短内容后重试。" : "请求内容不是有效的 JSON。");
  }

  try {
    const limit = await authRateLimitRepository.consume({
      key: rateLimitKey(request),
      windowSeconds: 60,
      max: 10,
      nowMs: Date.now(),
    });
    if (!limit.allowed) {
      return errorResponse(429, "提问太频繁，请稍后再试。", { "Retry-After": String(limit.retryAfter) });
    }
    const shopContext = await loadShopContext(supportSearchText(input.messages), input.productSlug);
    const reply = await requestCustomerSupportReply({
      apiKey: env.DEEPSEEK_API_KEY,
      model: env.DEEPSEEK_MODEL,
      messages: input.messages,
      shopContext,
    });
    return Response.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[support-chat] 客服请求失败", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(502, "AI 客服暂时无法回答，请稍后重试。");
  }
}
