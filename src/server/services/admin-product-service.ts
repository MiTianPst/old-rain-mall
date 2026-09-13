import type { AdminIdentity } from "@/server/admin/auth";
import type { AdminProductInput } from "@/features/admin/product-schema";

export type AdminProductRecord = AdminProductInput & {
  id: number;
  version: number;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminCategoryOption = { id: number; name: string; status: "ACTIVE" | "HIDDEN" };
export type ProductMutationResult =
  | { status: "CREATED" | "UPDATED" | "ARCHIVED"; id: number }
  | { status: "NOT_FOUND" | "CONFLICT" | "SLUG_CONFLICT" };

export interface AdminProductRepository {
  list(input: { search?: string; status?: AdminProductInput["status"]; page: number; pageSize: number }): Promise<{ items: AdminProductRecord[]; total: number }>;
  listCategories(): Promise<AdminCategoryOption[]>;
  getById(id: number): Promise<AdminProductRecord | null>;
  create(input: AdminProductInput): Promise<ProductMutationResult>;
  update(input: { id: number; version: number; data: AdminProductInput }): Promise<ProductMutationResult>;
  archive(input: { id: number; version: number }): Promise<ProductMutationResult>;
}

function unauthorized() { return { ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" }; }
function mapResult(result: ProductMutationResult) {
  if (result.status === "SLUG_CONFLICT") return { ok: false as const, code: result.status, message: "商品标识已存在" };
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
  };
}
