"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseAdminProductFormData, parsePositiveInteger } from "@/features/admin/product-schema";
import { getAdminSession } from "@/server/admin/auth";
import { adminProductService } from "@/server/admin-products";

export type AdminProductActionState = { status: "IDLE" | "SUCCESS" | "ERROR"; message: string; fieldErrors?: Record<string, string[]> };
const errorState = (message: string, fieldErrors?: Record<string, string[]>): AdminProductActionState => ({ status: "ERROR", message, fieldErrors });
function refreshProductPaths() { revalidatePath("/admin/products"); revalidatePath("/"); revalidatePath("/products/[slug]", "page"); }

export async function createAdminProductAction(_state: AdminProductActionState, formData: FormData): Promise<AdminProductActionState> {
  const admin = await getAdminSession();
  if (!admin) return errorState("没有后台管理权限");
  const parsed = parseAdminProductFormData(formData);
  if (!parsed.success) return errorState("请检查商品信息", parsed.fieldErrors);
  try {
    const result = await adminProductService.create(admin, parsed.data);
    if (!result.ok) return errorState(result.message);
  } catch (error) { console.error("创建商品失败", { error }); return errorState("创建商品失败，请稍后重试"); }
  refreshProductPaths();
  redirect("/admin/products");
}

export async function updateAdminProductAction(_state: AdminProductActionState, formData: FormData): Promise<AdminProductActionState> {
  const admin = await getAdminSession();
  if (!admin) return errorState("没有后台管理权限");
  const id = parsePositiveInteger(formData.get("id"));
  const version = Number(formData.get("version"));
  if (!id || !Number.isSafeInteger(version) || version < 0) return errorState("商品信息已失效，请刷新后重试");
  const parsed = parseAdminProductFormData(formData);
  if (!parsed.success) return errorState("请检查商品信息", parsed.fieldErrors);
  try {
    const result = await adminProductService.update(admin, { id, version, data: parsed.data });
    if (!result.ok) return errorState(result.message);
  } catch (error) { console.error("更新商品失败", { error }); return errorState("更新商品失败，请稍后重试"); }
  refreshProductPaths();
  redirect("/admin/products");
}

export async function archiveAdminProductAction(_state: AdminProductActionState, formData: FormData): Promise<AdminProductActionState> {
  const admin = await getAdminSession();
  if (!admin) return errorState("没有后台管理权限");
  const id = parsePositiveInteger(formData.get("id"));
  const versionValue = Number(formData.get("version"));
  if (!id || !Number.isSafeInteger(versionValue) || versionValue < 0) return errorState("商品信息已失效，请刷新后重试");
  try {
    const result = await adminProductService.archive(admin, { id, version: versionValue });
    if (!result.ok) return errorState(result.message);
  } catch (error) { console.error("归档商品失败", { error }); return errorState("归档商品失败，请稍后重试"); }
  refreshProductPaths();
  return { status: "SUCCESS", message: "商品已归档" };
}
