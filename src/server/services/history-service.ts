import type { ProductCardDto } from "./catalog-service";

export type HistoryViewRecord = {
  product: ProductCardDto;
  lastViewedAt: Date;
  viewCount: number;
};

export type HistoryRepositoryResult =
  | { status: "RECORDED" }
  | { status: "PRODUCT_UNAVAILABLE" };

export interface HistoryRepository {
  recordView(input: { userId: string; productId: number; now: Date }): Promise<HistoryRepositoryResult>;
  listRecentViews(userId: string, limit: number): Promise<HistoryViewRecord[]>;
  clearViews(userId: string): Promise<void>;
}

export function createHistoryService(repository: HistoryRepository) {
  return {
    async recordView(input: {
      userId: string | null;
      userStatus?: "ACTIVE" | "FROZEN";
      productId: number;
    }) {
      if (!input.userId) {
        return {
          ok: false as const,
          code: "UNAUTHORIZED" as const,
          message: "请先登录后记录浏览足迹",
        };
      }
      if (input.userStatus === "FROZEN") {
        return {
          ok: false as const,
          code: "ACCOUNT_FROZEN" as const,
          message: "账号已被冻结，暂时无法记录浏览足迹",
        };
      }
      const result = await repository.recordView({
        userId: input.userId,
        productId: input.productId,
        now: new Date(),
      });
      return result.status === "RECORDED"
        ? { ok: true as const }
        : {
            ok: false as const,
            code: "PRODUCT_UNAVAILABLE" as const,
            message: "商品不存在或已下架",
          };
    },

    listRecentViews(userId: string | null, limit: number) {
      return userId ? repository.listRecentViews(userId, limit) : Promise.resolve([] as HistoryViewRecord[]);
    },

    clearViews(userId: string | null) {
      return userId ? repository.clearViews(userId) : Promise.resolve();
    },
  };
}

export type HistoryService = ReturnType<typeof createHistoryService>;
