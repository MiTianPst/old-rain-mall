import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadDirectory = path.join(process.cwd(), "public", "uploads", "products");
const publicPrefix = "/uploads/products/";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ProductImageStorage = {
  save(file: File): Promise<{ path: string; url: string }>;
  remove(url: string): Promise<void>;
};

export const productImageStorage: ProductImageStorage = {
  async save(file) {
    const extension = extensions[file.type];
    if (!extension) throw new Error("不支持的图片类型");
    const filename = `${randomUUID()}.${extension}`;
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()), {
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

