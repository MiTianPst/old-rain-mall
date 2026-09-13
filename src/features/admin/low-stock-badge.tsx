import { isLowStock } from "@/lib/inventory";

export function LowStockBadge({ stock }: { stock: number }) {
  if (!isLowStock(stock)) return null;
  return <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800">库存紧张</span>;
}
