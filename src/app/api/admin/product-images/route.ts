import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/server/admin/auth";
import { productImageRepository } from "@/server/repositories/product-image-repository";
import { createProductImageService } from "@/server/services/product-image-service";

const service = createProductImageService(productImageRepository);

function errorResponse(result: { code: string; message: string }) {
  const status = result.code === "FORBIDDEN" ? 403 : result.code === "NOT_FOUND" ? 404 : 400;
  return Response.json({ error: result }, { status });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  try {
    const formData = await request.formData();
    const productId = Number(formData.get("productId"));
    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ error: { code: "INVALID_FILE", message: "请选择图片文件" } }, { status: 400 });
    const result = await service.upload(admin, { productId, file });
    if (!result.ok) return errorResponse(result);
    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath("/", "page");
    revalidatePath("/products/[slug]", "page");
    return Response.json({ data: result.image }, { status: 201 });
  } catch (error) {
    console.error("上传商品图片失败", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "图片上传失败，请稍后重试" } }, { status: 500 });
  }
}

