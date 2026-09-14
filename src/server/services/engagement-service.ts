export type EngagementUserStatus = "ACTIVE" | "FROZEN";

export type FavoriteToggleRepositoryResult =
  | { status: "ADDED" }
  | { status: "REMOVED" }
  | { status: "PRODUCT_UNAVAILABLE" };

export interface EngagementRepository {
  toggleFavorite(input: {
    userId: string;
    productId: number;
  }): Promise<FavoriteToggleRepositoryResult>;
  listFavoriteProductIds(userId: string, productIds?: number[]): Promise<number[]>;
}

type ToggleFavoriteInput = {
  userId: string | null;
  userStatus?: EngagementUserStatus;
  productId: number;
};

export function createEngagementService(repository: EngagementRepository) {
  return {
    async toggleFavorite(input: ToggleFavoriteInput) {
      if (!input.userId) {
        return {
          ok: false as const,
          code: "UNAUTHORIZED" as const,
          message: "请先登录后收藏商品",
        };
      }
      if (input.userStatus === "FROZEN") {
        return {
          ok: false as const,
          code: "ACCOUNT_FROZEN" as const,
          message: "账号已被冻结，暂时无法收藏商品",
        };
      }

      const result = await repository.toggleFavorite({
        userId: input.userId,
        productId: input.productId,
      });

      if (result.status === "PRODUCT_UNAVAILABLE") {
        return {
          ok: false as const,
          code: "PRODUCT_UNAVAILABLE" as const,
          message: "商品不存在或已下架",
        };
      }

      return {
        ok: true as const,
        favorited: result.status === "ADDED",
        message: result.status === "ADDED" ? "已加入收藏" : "已取消收藏",
      };
    },

    listFavoriteProductIds(userId: string | null, productIds?: number[]) {
      return userId ? repository.listFavoriteProductIds(userId, productIds) : Promise.resolve([]);
    },
  };
}

export type EngagementService = ReturnType<typeof createEngagementService>;
