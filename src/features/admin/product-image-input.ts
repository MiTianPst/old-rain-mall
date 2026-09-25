// 校验后台商品表单选择的图片，供新增商品与图片上传共用同一套文件限制。
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

// 校验实际上传的文件，避免把空文件或其他格式写入商品图册。
export function validateProductImage(file: File) {
  if (file.size <= 0) return { ok: false as const, message: "请选择非空图片文件" };
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) return { ok: false as const, message: "图片大小不能超过 5 MB" };
  if (!allowedTypes.has(file.type)) return { ok: false as const, message: "仅支持 JPG、PNG 或 WebP 图片" };
  return { ok: true as const };
}

// 把未选择文件的空值与有效图片区分开，让商品可以不带图片保存为草稿。
export function parseOptionalProductImage(value: FormDataEntryValue | null) {
  if (value === null || (value instanceof File && value.size === 0 && value.name === "")) {
    return { ok: true as const, file: null };
  }
  if (!(value instanceof File)) return { ok: false as const, message: "请选择图片文件" };
  const validation = validateProductImage(value);
  return validation.ok ? { ok: true as const, file: value } : validation;
}
