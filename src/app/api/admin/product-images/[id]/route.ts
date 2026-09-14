import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/server/admin/auth";
import { productImageRepository } from "@/server/repositories/product-image-repository";
import { createProductImageService } from "@/server/services/product-image-service";
import { auditService } from "@/server/audit";

const service = createProductImageService(productImageRepository);

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function errorResponse(result: { code: string; message: string }) {
  const status = result.code === "FORBIDDEN" ? 403 : result.code === "NOT_FOUND" ? 404 : 400;
  return Response.json({ error: result }, { status });
}

type ImageRouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: ImageRouteContext) {
  const id = parseId((await context.params).id);
  if (!id) return Response.json({ error: { code: "INVALID_INPUT", message: "图片编号不正确" } }, { status: 400 });
  const result = await service.remove(await getAdminSession(), id);
  if (!result.ok) return errorResponse(result);
  revalidatePath(`/admin/products/${result.image.productId}/edit`);
  revalidatePath("/", "page");
  revalidatePath("/products/[slug]", "page");
  await auditService.record(await getAdminSession(), { action: "PRODUCT_IMAGE_DELETE", targetType: "PRODUCT_IMAGE", targetId: String(id), summary: "删除商品图片" }).catch(() => undefined);
  return Response.json({ data: result.image });
}

export async function PATCH(request: Request, context: ImageRouteContext) {
  const id = parseId((await context.params).id);
  if (!id) return Response.json({ error: { code: "INVALID_INPUT", message: "图片编号不正确" } }, { status: 400 });
  try {
    const body: unknown = await request.json();
    const input = body && typeof body === "object" ? body as { isPrimary?: unknown; sortOrder?: unknown } : {};
    const result = await service.update(await getAdminSession(), id, {
      ...(typeof input.isPrimary === "boolean" ? { isPrimary: input.isPrimary } : {}),
      ...(typeof input.sortOrder === "number" ? { sortOrder: input.sortOrder } : {}),
    });
    if (!result.ok) return errorResponse(result);
    revalidatePath(`/admin/products/${result.image.productId}/edit`);
    revalidatePath("/", "page");
    revalidatePath("/products/[slug]", "page");
    await auditService.record(await getAdminSession(), { action: input.isPrimary === true ? "PRODUCT_IMAGE_PRIMARY" : "PRODUCT_IMAGE_REORDER", targetType: "PRODUCT_IMAGE", targetId: String(id), summary: "更新商品图片" }).catch(() => undefined);
    return Response.json({ data: result.image });
  } catch {
    return Response.json({ error: { code: "INVALID_INPUT", message: "图片更新内容不正确" } }, { status: 400 });
  }
}
