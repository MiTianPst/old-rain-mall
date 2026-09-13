import type { AdminCategoryInput } from "@/features/admin/category-schema";
import type { AdminIdentity } from "@/server/admin/auth";

export type AdminCategoryRecord = AdminCategoryInput & { id: number; productCount: number; createdAt: Date; updatedAt: Date };
export type CategoryMutationResult = { status: "CREATED" | "UPDATED" | "STATUS_CHANGED"; id: number } | { status: "NOT_FOUND" | "SLUG_CONFLICT" };
export interface AdminCategoryRepository {
  list(): Promise<AdminCategoryRecord[]>;
  create(input: AdminCategoryInput): Promise<CategoryMutationResult>;
  update(input: { id: number; data: AdminCategoryInput }): Promise<CategoryMutationResult>;
  setStatus(input: { id: number; status: AdminCategoryInput["status"] }): Promise<CategoryMutationResult>;
}
const denied = () => ({ ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" });
function mapMutation(result: CategoryMutationResult) {
  if (result.status === "SLUG_CONFLICT") return { ok: false as const, code: result.status, message: "分类标识已存在" };
  if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "分类不存在" };
  if (result.status === "CREATED" || result.status === "UPDATED" || result.status === "STATUS_CHANGED") {
    return { ok: true as const, id: result.id, message: result.status === "STATUS_CHANGED" ? "分类状态已更新" : "分类已保存" };
  }
  return { ok: false as const, code: "NOT_FOUND" as const, message: "分类操作失败" };
}
export function createAdminCategoryService(repository: AdminCategoryRepository) { return {
  async list(admin: AdminIdentity | null) { if (!admin) return denied(); return { ok: true as const, data: await repository.list() }; },
  async create(admin: AdminIdentity | null, data: AdminCategoryInput) { if (!admin) return denied(); return mapMutation(await repository.create(data)); },
  async update(admin: AdminIdentity | null, input: { id: number; data: AdminCategoryInput }) { if (!admin) return denied(); return mapMutation(await repository.update(input)); },
  async setStatus(admin: AdminIdentity | null, input: { id: number; status: AdminCategoryInput["status"] }) { if (!admin) return denied(); return mapMutation(await repository.setStatus(input)); },
}; }
