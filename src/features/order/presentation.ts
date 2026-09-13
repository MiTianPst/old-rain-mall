import type { OrderRecord } from "@/server/services/order-service";

export const orderStatusLabels: Record<OrderRecord["status"], string> = {
  PENDING_PAYMENT: "待支付",
  PAID: "已支付",
  SHIPPED: "已发货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  CLOSED: "已关闭",
};

export function formatOrderTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDiscountRate(discountRateBps: number) {
  const discount = discountRateBps / 1000;
  return `${Number.isInteger(discount) ? discount.toFixed(0) : discount.toFixed(1)} 折`;
}
