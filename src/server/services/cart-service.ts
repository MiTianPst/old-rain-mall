export type CartWriteResult =
  | { status: "ADDED"; quantity: number }
  | { status: "PRODUCT_UNAVAILABLE" }
  | { status: "STOCK_EXCEEDED"; stock: number };

export type CartUpdateResult =
  | { status: "UPDATED"; quantity: number }
  | { status: "ITEM_NOT_FOUND" }
  | { status: "PRODUCT_UNAVAILABLE" }
  | { status: "STOCK_EXCEEDED"; stock: number };

export type CartItemRecord = {
  id: number;
  quantity: number;
  product: {
    id: number;
    variantId: number;
    slug: string;
    name: string;
    variantName: string;
    variantAttributes: Record<string, string>;
    priceCents: number;
    stock: number;
    coverUrl: string | null;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    variantStatus: "ACTIVE" | "ARCHIVED";
    categoryStatus: "ACTIVE" | "HIDDEN";
  };
};

export interface CartRepository {
  addItem(input: {
    userId: string;
    variantId: number;
    quantity: number;
  }): Promise<CartWriteResult>;
  updateItem(input: {
    userId: string;
    cartItemId: number;
    quantity: number;
  }): Promise<CartUpdateResult>;
  removeItem(input: { userId: string; cartItemId: number }): Promise<boolean>;
  listItems(userId: string): Promise<CartItemRecord[]>;
}

export function createCartService(repository: CartRepository) {
  return {
    async addItem(input: {
      userId: string | null;
      variantId: number;
      quantity: number;
    }) {
      if (!input.userId) {
        return {
          ok: false as const,
          code: "UNAUTHORIZED" as const,
          message: "请先登录后再加入购物车",
        };
      }

      if (!Number.isSafeInteger(input.variantId) || input.variantId <= 0) {
        return {
          ok: false as const,
          code: "INVALID_INPUT" as const,
          message: "商品规格参数不正确",
        };
      }

      if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        return {
          ok: false as const,
          code: "INVALID_INPUT" as const,
          message: "商品数量必须是正整数",
        };
      }

      const result = await repository.addItem({
        userId: input.userId,
        variantId: input.variantId,
        quantity: input.quantity,
      });

      if (result.status === "PRODUCT_UNAVAILABLE") {
        return {
          ok: false as const,
          code: "PRODUCT_UNAVAILABLE" as const,
          message: "商品不存在或已下架",
        };
      }

      if (result.status === "STOCK_EXCEEDED") {
        return {
          ok: false as const,
          code: "STOCK_EXCEEDED" as const,
          message: `库存不足，当前仅剩 ${result.stock} 件`,
        };
      }

      return {
        ok: true as const,
        quantity: result.quantity,
        message:
          result.quantity === 1
            ? "已加入购物车"
            : `已加入购物车，当前共 ${result.quantity} 件`,
      };
    },

    async updateItem(input: {
      userId: string | null;
      cartItemId: number;
      quantity: number;
    }) {
      if (!input.userId) {
        return {
          ok: false as const,
          code: "UNAUTHORIZED" as const,
          message: "请先登录后再操作购物车",
        };
      }

      if (
        !Number.isInteger(input.quantity) ||
        input.quantity < 1 ||
        input.quantity > 99
      ) {
        return {
          ok: false as const,
          code: "INVALID_INPUT" as const,
          message: "商品数量必须是 1 到 99 的整数",
        };
      }

      const result = await repository.updateItem({
        userId: input.userId,
        cartItemId: input.cartItemId,
        quantity: input.quantity,
      });

      if (result.status === "ITEM_NOT_FOUND") {
        return {
          ok: false as const,
          code: "ITEM_NOT_FOUND" as const,
          message: "购物车商品不存在",
        };
      }

      if (result.status === "PRODUCT_UNAVAILABLE") {
        return {
          ok: false as const,
          code: "PRODUCT_UNAVAILABLE" as const,
          message: "商品已下架或所属分类已隐藏",
        };
      }

      if (result.status === "STOCK_EXCEEDED") {
        return {
          ok: false as const,
          code: "STOCK_EXCEEDED" as const,
          message: `库存不足，当前仅剩 ${result.stock} 件`,
        };
      }

      return {
        ok: true as const,
        quantity: result.quantity,
        message: "购物车数量已更新",
      };
    },

    async removeItem(input: { userId: string | null; cartItemId: number }) {
      if (!input.userId) {
        return {
          ok: false as const,
          code: "UNAUTHORIZED" as const,
          message: "请先登录后再操作购物车",
        };
      }

      const removed = await repository.removeItem({
        userId: input.userId,
        cartItemId: input.cartItemId,
      });

      return removed
        ? { ok: true as const, message: "商品已从购物车移除" }
        : {
            ok: false as const,
            code: "ITEM_NOT_FOUND" as const,
            message: "购物车商品不存在",
          };
    },

    async listItems(userId: string) {
      const items = await repository.listItems(userId);
      const data = items.map((item) => ({
        ...item,
        lineTotalCents: item.product.priceCents * item.quantity,
        available:
          item.product.status === "ACTIVE" &&
          item.product.variantStatus === "ACTIVE" &&
          item.product.categoryStatus === "ACTIVE" &&
          item.product.stock >= item.quantity,
      }));

      const availableItems = data.filter((item) => item.available);

      return {
        data,
        totalQuantity: availableItems.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        totalCents: availableItems.reduce(
          (sum, item) => sum + item.lineTotalCents,
          0,
        ),
      };
    },
  };
}

export type CartService = ReturnType<typeof createCartService>;
