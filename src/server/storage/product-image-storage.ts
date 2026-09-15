import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const uploadDirectory = path.join(process.cwd(), "public", "uploads", "products");
const publicPrefix = "/uploads/products/";

const maxImageDimension = 5000;
const outputImageDimension = 2400;

export type ProductImageStorage = {
  save(file: File): Promise<{ path: string; url: string }>;
  remove(url: string): Promise<void>;
};

export const productImageStorage: ProductImageStorage = {
  async save(file) {
    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input).metadata();
    if ((metadata.width ?? 0) > maxImageDimension || (metadata.height ?? 0) > maxImageDimension) {
      throw new Error(`图片尺寸不能超过 ${maxImageDimension} 像素`);
    }
    const optimized = await sharp(input)
      .rotate()
      .resize({
        width: outputImageDimension,
        height: outputImageDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    const filename = `${randomUUID()}.webp`;
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, filename), optimized, {
      flag: "wx",
    });
    return { path: path.join(uploadDirectory, filename), url: `${publicPrefix}${filename}` };
  },

  async remove(url) {
    if (!isSafeProductImageUrl(url)) return;
    const filename = url.slice(publicPrefix.length);
    await unlink(path.join(uploadDirectory, filename)).catch((error: unknown) => {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code !== "ENOENT") throw error;
    });
  },
};

export function isSafeProductImageUrl(url: string) {
  const filename = url.startsWith(publicPrefix) ? url.slice(publicPrefix.length) : "";
  return Boolean(filename) && filename === path.basename(filename) && /^[a-f0-9-]+\.(?:jpg|png|webp)$/.test(filename);
}
