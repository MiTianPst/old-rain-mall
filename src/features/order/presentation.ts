import type { OrderRecord } from "@/server/services/order-service";

export const orderStatusLabels: Record<OrderRecord["status"], string> = {
  PENDING_PAYMENT: "待支付",
  PAID: "已支付",
  SHIPPED: "已发货",
  IN_TRANSIT: "运输中",
  DELIVERED: "已送达",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  CLOSED: "已关闭",
  REFUNDED: "已退款",
};

export const shipmentStatusLabels = {
  PENDING: "待发货",
  SHIPPED: "已发货",
  IN_TRANSIT: "运输中",
  DELIVERED: "已送达",
} as const;

export const afterSaleStatusLabels = {
  REQUESTED: "待审核",
  APPROVED: "审核通过",
  REJECTED: "已拒绝",
  REFUNDING: "退款中",
  REFUNDED: "已退款",
} as const;

export function formatOrderTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
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

export function formatVariantSnapshot(name: string, attributesJson: string) {
  let attributes: string[] = [];
  try {
    const parsed: unknown = JSON.parse(attributesJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      attributes = Object.values(parsed).filter((value): value is string => typeof value === "string" && value.length > 0);
    }
  } catch {
    // 历史订单可能没有有效的规格 JSON，统一降级为默认规格。
  }
  const parts = [name.trim(), attributes.join(" / ")].filter(Boolean);
  return parts.join(" · ") || "默认规格";
}
