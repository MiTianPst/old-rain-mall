import { randomBytes } from "node:crypto";

import type { AddressRecord } from "./address-service";
import type { CartItemRecord } from "./cart-service";
import { calculateOrderPricing, type OrderPricing } from "@/features/order/pricing";
import type { MembershipLevel } from "@/lib/membership";

export type OrderRecord = {
  id: number;
  orderNo: string;
  userId: string;
  status: "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "CLOSED";
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED";
  membershipLevelSnapshot: MembershipLevel;
  originalAmountCents: number;
  discountRateBps: number;
  memberDiscountCents: number;
  shippingFeeCents: number;
  totalCents: number;
  createdAt: Date;
  expiresAt: Date;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  paidAt: Date | null;
  cancelledAt: Date | null;
  items: Array<{
    productId: number;
    variantId: number;
    productName: string;
    variantName: string;
    variantAttributesJson: string;
    productCoverUrl: string | null;
    unitPriceCents: number;
    quantity: number;
    subtotalCents: number;
  }>;
};

export type CheckoutRecord = {
  user: { membershipLevel: MembershipLevel };
  addresses: AddressRecord[];
  items: CartItemRecord[];
};

export type OrderCreateResult =
  | { status: "CREATED"; orderNo: string }
  | { status: "USER_NOT_FOUND" }
  | { status: "ADDRESS_NOT_FOUND" }
  | { status: "EMPTY_CART" }
  | { status: "PRODUCT_UNAVAILABLE"; productName: string }
  | { status: "STOCK_EXCEEDED"; productName: string; stock: number };

export type OrderCancelResult =
  | { status: "CANCELLED" }
  | { status: "NOT_FOUND" }
  | { status: "NOT_CANCELLABLE" }
  | { status: "EXPIRED" };

export interface OrderRepository {
  getCheckout(userId: string): Promise<CheckoutRecord>;
  create(input: {
    userId: string;
    addressId: number;
    now: Date;
    expiresAt: Date;
    orderNo: string;
    paymentNo: string;
  }): Promise<OrderCreateResult>;
  listByUser(userId: string): Promise<OrderRecord[]>;
  getByOrderNo(input: { userId: string; orderNo: string }): Promise<OrderRecord | null>;
  cancel(input: { userId: string; orderNo: string; now: Date }): Promise<OrderCancelResult>;
  closeExpiredForUser(input: { userId: string; now: Date }): Promise<number>;
  closeExpiredBatch(input: { now: Date; limit: number }): Promise<number>;
}

export const ORDER_EXPIRATION_MS = 2 * 60 * 60 * 1000;

function idResult(message: string) {
  return { ok: false as const, code: "UNAUTHORIZED" as const, message };
}

function errorResult(code: "ADDRESS_NOT_FOUND" | "EMPTY_CART" | "PRODUCT_UNAVAILABLE" | "STOCK_EXCEEDED" | "ORDER_NOT_FOUND" | "ORDER_NOT_CANCELLABLE" | "ORDER_EXPIRED", message: string) {
  return { ok: false as const, code, message };
}

function makeNumber(prefix: string, now: Date) {
  const time = now.getTime().toString(36).toUpperCase();
  return `${prefix}${time}${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function createOrderService(repository: OrderRepository, options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date());
  const currentTime = () => new Date(now().getTime());

  return {
    async getCheckout(userId: string | null) {
      if (!userId) return idResult("请先登录后再结算");
      const checkout = await repository.getCheckout(userId);
      const originalAmountCents = checkout.items.reduce(
        (sum, item) => sum + item.product.priceCents * item.quantity,
        0,
      );
      const pricing: OrderPricing = calculateOrderPricing({
        originalAmountCents,
        membershipLevel: checkout.user.membershipLevel,
      });
      return { ok: true as const, data: checkout, pricing };
    },

    async createOrder(input: { userId: string | null; addressId: number }) {
      if (!input.userId) return idResult("请先登录后再创建订单");
      if (!Number.isSafeInteger(input.addressId) || input.addressId <= 0) {
        return errorResult("ADDRESS_NOT_FOUND", "收货地址不存在");
      }
      const createdAt = currentTime();
      const result = await repository.create({
        userId: input.userId,
        addressId: input.addressId,
        now: createdAt,
        expiresAt: new Date(createdAt.getTime() + ORDER_EXPIRATION_MS),
        orderNo: makeNumber("OR", createdAt),
        paymentNo: makeNumber("PAY", createdAt),
      });
      if (result.status === "CREATED") return { ok: true as const, orderNo: result.orderNo };
      if (result.status === "USER_NOT_FOUND") return idResult("登录状态已失效，请重新登录");
      if (result.status === "ADDRESS_NOT_FOUND") return errorResult("ADDRESS_NOT_FOUND", "收货地址不存在");
      if (result.status === "EMPTY_CART") return errorResult("EMPTY_CART", "购物车为空，无法创建订单");
      if (result.status === "PRODUCT_UNAVAILABLE") return errorResult("PRODUCT_UNAVAILABLE", `${result.productName}已下架或不可售`);
      return errorResult("STOCK_EXCEEDED", `${result.productName}库存不足，当前仅剩 ${result.stock} 件`);
    },

    async listOrders(userId: string | null) {
      if (!userId) return idResult("请先登录后查看订单");
      await repository.closeExpiredForUser({ userId, now: currentTime() });
      return { ok: true as const, data: await repository.listByUser(userId) };
    },

    async getOrder(input: { userId: string | null; orderNo: string }) {
      if (!input.userId) return idResult("请先登录后查看订单");
      await repository.closeExpiredForUser({ userId: input.userId, now: currentTime() });
      const order = await repository.getByOrderNo({ userId: input.userId, orderNo: input.orderNo });
      return order ? { ok: true as const, order } : errorResult("ORDER_NOT_FOUND", "订单不存在");
    },

    async cancelOrder(input: { userId: string | null; orderNo: string }) {
      if (!input.userId) return idResult("请先登录后取消订单");
      const result = await repository.cancel({ userId: input.userId, orderNo: input.orderNo, now: currentTime() });
      if (result.status === "CANCELLED") return { ok: true as const, message: "订单已取消" };
      if (result.status === "NOT_FOUND") return errorResult("ORDER_NOT_FOUND", "订单不存在");
      if (result.status === "EXPIRED") return errorResult("ORDER_EXPIRED", "订单已超时关闭");
      return errorResult("ORDER_NOT_CANCELLABLE", "当前订单状态不可取消");
    },

    async closeExpiredForUser(userId: string | null) {
      if (!userId) return idResult("请先登录后操作订单");
      return { ok: true as const, closedCount: await repository.closeExpiredForUser({ userId, now: currentTime() }) };
    },

    async closeExpiredBatch(limit: number) {
      const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 100;
      return { ok: true as const, closedCount: await repository.closeExpiredBatch({ now: currentTime(), limit: safeLimit }) };
    },
  };
}

export type OrderService = ReturnType<typeof createOrderService>;
