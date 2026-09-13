import { z } from "zod";

import { isLowStock } from "@/lib/inventory";
import type { AdminIdentity } from "@/server/admin/auth";

export type LowStockItem = {
  variantId: number;
  productId: number;
  productName: string;
  skuCode: string;
  stock: number;
};

export type InventoryAdjustmentResult =
  | { status: "ADJUSTED"; variantId: number; stockBefore: number; stockAfter: number }
  | { status: "NOT_FOUND" }
  | { status: "INSUFFICIENT_STOCK"; stock: number };

export interface InventoryRepository {
  adjustStock(input: { variantId: number; quantityDelta: number; note: string; operatorUserId: string }): Promise<InventoryAdjustmentResult>;
  listLowStock(): Promise<LowStockItem[]>;
}

const adjustmentSchema = z.object({
  variantId: z.number().int().positive(),
  quantityDelta: z.number().int().refine((value) => value !== 0),
  note: z.string().trim().min(1).max(500),
});

const forbidden = () => ({ ok: false as const, code: "FORBIDDEN" as const, message: "没有后台管理权限" });

export function createInventoryService(repository: InventoryRepository) {
  return {
    isLowStock,
    async adjustStock(admin: AdminIdentity | null, input: { variantId: number; quantityDelta: number; note: string }) {
      if (!admin) return forbidden();
      const parsed = adjustmentSchema.safeParse(input);
      if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" as const, message: "请填写有效的库存变更数量和备注" };
      const result = await repository.adjustStock({ ...parsed.data, operatorUserId: admin.id });
      if (result.status === "NOT_FOUND") return { ok: false as const, code: result.status, message: "SKU 不存在" };
      if (result.status === "INSUFFICIENT_STOCK") return { ok: false as const, code: result.status, message: `库存不足，当前库存为 ${result.stock}` };
      return { ok: true as const, variantId: result.variantId, stockBefore: result.stockBefore, stockAfter: result.stockAfter, message: "库存已更新" };
    },
    async listLowStock(admin: AdminIdentity | null) {
      if (!admin) return forbidden();
      return { ok: true as const, data: await repository.listLowStock() };
    },
  };
}
