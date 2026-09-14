export const LOW_STOCK_THRESHOLD = 10;

export function isLowStock(stock: number) {
  return stock <= LOW_STOCK_THRESHOLD;
}
