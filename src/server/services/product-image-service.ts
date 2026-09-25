import { z } from "zod";

import { validateProductImage } from "@/features/admin/product-image-input";
import type { AdminIdentity } from "@/server/admin/auth";
import type { ProductImageDto } from "@/server/services/catalog-service";
import { productImageStorage, type ProductImageStorage } from "@/server/storage/product-image-storage";

export type ProductImageRecord = ProductImageDto & { productId: number };

export interface ProductImageRepository {
  productExists(productId: number): Promise<boolean>;
  add(input: { productId: number; url: string }): Promise<ProductImageRecord>;
  findById(imageId: number): Promise<ProductImageRecord | null>;
  remove(imageId: number): Promise<ProductImageRecord | null>;
  update(imageId: number, input: { isPrimary?: boolean; sortOrder?: number }): Promise<ProductImageRecord | null>;
}

const inputSchema = z.object({ productId: z.number().int().positive() });

export function createProductImageService(
  repository: ProductImageRepository,
  storage: ProductImageStorage = productImageStorage,
) {
  return {
    async upload(admin: AdminIdentity | null, input: { productId: number; file: File }) {
      if (!admin) return { ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" };
      const parsed = inputSchema.safeParse({ productId: input.productId });
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: "商品编号不正确" };
      const validation = validateProductImage(input.file);
      if (!validation.ok) return { ok: false as const, code: "INVALID_FILE" as const, message: validation.message };
      if (!(await repository.productExists(parsed.data.productId))) {
        return { ok: false as const, code: "NOT_FOUND" as const, message: "商品不存在" };
      }

      const saved = await storage.save(input.file);
      try {
        const image = await repository.add({ productId: parsed.data.productId, url: saved.url });
        return { ok: true as const, image };
      } catch (error) {
        await storage.remove(saved.url).catch(() => undefined);
        throw error;
      }
    },

    async remove(admin: AdminIdentity | null, imageId: number) {
      if (!admin) return { ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" };
      if (!Number.isSafeInteger(imageId) || imageId <= 0) {
        return { ok: false as const, code: "INVALID_INPUT" as const, message: "图片编号不正确" };
      }
      const image = await repository.remove(imageId);
      if (!image) return { ok: false as const, code: "NOT_FOUND" as const, message: "图片不存在" };
      await storage.remove(image.url);
      return { ok: true as const, image };
    },

    async update(admin: AdminIdentity | null, imageId: number, input: { isPrimary?: boolean; sortOrder?: number }) {
      if (!admin) return { ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" };
      if (!Number.isSafeInteger(imageId) || imageId <= 0) {
        return { ok: false as const, code: "INVALID_INPUT" as const, message: "图片编号不正确" };
      }
      const parsed = z.object({ isPrimary: z.boolean().optional(), sortOrder: z.number().int().min(0).max(9999).optional() }).safeParse(input);
      if (!parsed.success || (parsed.data.isPrimary === undefined && parsed.data.sortOrder === undefined)) {
        return { ok: false as const, code: "INVALID_INPUT" as const, message: "图片更新内容不正确" };
      }
      const image = await repository.update(imageId, parsed.data);
      return image
        ? { ok: true as const, image }
        : { ok: false as const, code: "NOT_FOUND" as const, message: "图片不存在" };
    },
  };
}

