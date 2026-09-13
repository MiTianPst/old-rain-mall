import type { AdminIdentity } from "@/server/admin/auth";
import { adminVariantsSchema, yuanToCents, type AdminProductInput, type AdminVariantInput } from "@/features/admin/product-schema";

export type AdminVariantRecord = AdminVariantInput & { id: number };
export type AdminProductImageRecord = {
  id: number;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type AdminProductRecord = AdminProductInput & {
  id: number;
  stock: number;
  version: number;
  categoryName: string;
  variants: AdminVariantRecord[];
  images?: AdminProductImageRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type AdminCategoryOption = { id: number; name: string; status: "ACTIVE" | "HIDDEN" };
export type ProductMutationResult =
  | { status: "CREATED" | "UPDATED" | "ARCHIVED"; id: number }
  | { status: "NOT_FOUND" | "CONFLICT" | "SLUG_CONFLICT" | "SKU_CONFLICT" };

export interface AdminProductRepository {
  list(input: { search?: string; status?: AdminProductInput["status"]; page: number; pageSize: number }): Promise<{ items: AdminProductRecord[]; total: number }>;
  listCategories(): Promise<AdminCategoryOption[]>;
  getById(id: number): Promise<AdminProductRecord | null>;
  create(input: AdminProductInput): Promise<ProductMutationResult>;
  update(input: { id: number; version: number; data: AdminProductInput }): Promise<ProductMutationResult>;
  archive(input: { id: number; version: number }): Promise<ProductMutationResult>;
  updateVariants(input: { productId: number; version: number; variants: AdminVariantInput[] }): Promise<ProductMutationResult>;
}

function unauthorized() { return { ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" }; }
function mapResult(result: ProductMutationResult) {
  if (result.status === "SLUG_CONFLICT") return { ok: false as const, code: result.status, message: "商品标识已存在" };
  if (result.status === "SKU_CONFLICT") return { ok: false as const, code: "VALIDATION_ERROR" as const, message: "SKU 编码已存在" };
  if (result.status === "CONFLICT") return { ok: false as const, code: result.status, message: "商品已被其他管理员修改，请刷新后重试" };
  if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "商品不存在" };
  if (result.status === "CREATED" || result.status === "UPDATED" || result.status === "ARCHIVED") {
    return { ok: true as const, id: result.id, message: result.status === "ARCHIVED" ? "商品已归档" : "商品已保存" };
  }
  return { ok: false as const, code: "CONFLICT" as const, message: "商品操作失败" };
}

export function createAdminProductService(repository: AdminProductRepository) {
  return {
    async list(admin: AdminIdentity | null, input: { search?: string; status?: AdminProductInput["status"]; page: number }) {
      if (!admin) return unauthorized();
      return { ok: true as const, data: await repository.list({ ...input, pageSize: 10 }) };
    },
    async listCategories(admin: AdminIdentity | null) { if (!admin) return unauthorized(); return { ok: true as const, data: await repository.listCategories() }; },
    async getById(admin: AdminIdentity | null, id: number) { if (!admin) return unauthorized(); const product = await repository.getById(id); return product ? { ok: true as const, product } : { ok: false as const, code: "NOT_FOUND" as const, message: "商品不存在" }; },
    async create(admin: AdminIdentity | null, input: AdminProductInput) { if (!admin) return unauthorized(); return mapResult(await repository.create(input)); },
    async update(admin: AdminIdentity | null, input: { id: number; version: number; data: AdminProductInput }) { if (!admin) return unauthorized(); return mapResult(await repository.update(input)); },
    async archive(admin: AdminIdentity | null, input: { id: number; version: number }) { if (!admin) return unauthorized(); return mapResult(await repository.archive(input)); },
    async updateVariants(admin: AdminIdentity | null, input: { productId: number; version: number; variants: AdminVariantInput[] }) {
      if (!admin) return unauthorized();
      if (!Number.isSafeInteger(input.productId) || input.productId <= 0 || !Number.isSafeInteger(input.version) || input.version < 0) {
        return { ok: false as const, code: "VALIDATION_ERROR" as const, message: "商品信息已失效，请刷新后重试" };
      }
      const parsed = adminVariantsSchema.safeParse(input.variants);
      if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" as const, message: parsed.error.issues[0]?.message ?? "请检查 SKU 信息" };
      if (!parsed.data.some((variant) => variant.status === "ACTIVE")) {
        return { ok: false as const, code: "VALIDATION_ERROR" as const, message: "至少保留一个在售 SKU" };
      }
      const normalizedCodes = parsed.data.map((variant) => variant.skuCode.toLocaleUpperCase());
      if (new Set(normalizedCodes).size !== normalizedCodes.length) {
        return { ok: false as const, code: "VALIDATION_ERROR" as const, message: "SKU 编码不能重复" };
      }
      if (parsed.data.some((variant) => yuanToCents(variant.priceYuan) === null)) {
        return { ok: false as const, code: "VALIDATION_ERROR" as const, message: "请输入最多两位小数的有效价格" };
      }
      return mapResult(await repository.updateVariants({ ...input, variants: parsed.data }));
    },
  };
}
