"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseAdminProductFormData, parseAdminVariants, parsePositiveInteger } from "@/features/admin/product-schema";
import { getAdminSession } from "@/server/admin/auth";
import { adminProductService } from "@/server/admin-products";
import { inventoryService } from "@/server/inventory";
import { auditService } from "@/server/audit";

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
    await auditService.record(admin, { action: "PRODUCT_CREATE", targetType: "PRODUCT", targetId: String(result.id), summary: `创建商品：${parsed.data.name}` }).catch(() => undefined);
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
    await auditService.record(admin, { action: "PRODUCT_UPDATE", targetType: "PRODUCT", targetId: String(id), summary: `更新商品：${parsed.data.name}` }).catch(() => undefined);
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
    await auditService.record(admin, { action: "PRODUCT_ARCHIVE", targetType: "PRODUCT", targetId: String(id), summary: "归档商品" }).catch(() => undefined);
  } catch (error) { console.error("归档商品失败", { error }); return errorState("归档商品失败，请稍后重试"); }
  refreshProductPaths();
  return { status: "SUCCESS", message: "商品已归档" };
}

export async function updateAdminVariantsAction(_state: AdminProductActionState, formData: FormData): Promise<AdminProductActionState> {
  const admin = await getAdminSession();
  if (!admin) return errorState("没有后台管理权限");
  const productId = parsePositiveInteger(formData.get("productId"));
  const version = Number(formData.get("version"));
  const rawVariants = formData.get("variants");
  if (!productId || !Number.isSafeInteger(version) || version < 0 || typeof rawVariants !== "string") return errorState("商品信息已失效，请刷新后重试");
  const parsed = parseAdminVariants(rawVariants);
  if (!parsed.success) return errorState("请检查 SKU 信息", parsed.fieldErrors);
  try {
    const result = await adminProductService.updateVariants(admin, { productId, version, variants: parsed.data });
    if (!result.ok) return errorState(result.message);
    await auditService.record(admin, { action: "VARIANT_UPDATE", targetType: "PRODUCT", targetId: String(productId), summary: "更新商品 SKU" }).catch(() => undefined);
  } catch (error) { console.error("更新 SKU 失败", { error }); return errorState("更新 SKU 失败，请稍后重试"); }
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/products/[slug]", "page");
  return { status: "SUCCESS", message: "SKU 已保存" };
}

export async function adjustInventoryAction(_state: AdminProductActionState, formData: FormData): Promise<AdminProductActionState> {
  const admin = await getAdminSession();
  if (!admin) return errorState("没有后台管理权限");
  const variantId = parsePositiveInteger(formData.get("variantId"));
  const quantityDelta = Number(formData.get("quantityDelta"));
  const note = formData.get("note");
  if (!variantId || !Number.isSafeInteger(quantityDelta) || typeof note !== "string") return errorState("请填写有效的库存变更数量和备注");
  try {
    const result = await inventoryService.adjustStock(admin, { variantId, quantityDelta, note });
    if (!result.ok) return errorState(result.message);
    await auditService.record(admin, { action: "INVENTORY_ADJUST", targetType: "INVENTORY", targetId: String(variantId), summary: `调整库存：${quantityDelta}` }).catch(() => undefined);
    revalidatePath("/admin/products");
    revalidatePath("/admin/products/[id]/edit", "page");
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/products/[slug]", "page");
    return { status: "SUCCESS", message: `库存已从 ${result.stockBefore} 调整为 ${result.stockAfter}` };
  } catch (error) { console.error("调整库存失败", { error }); return errorState("调整库存失败，请稍后重试"); }
}
