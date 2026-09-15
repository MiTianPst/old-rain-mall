export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PublicReviewRecord = {
  id: number;
  rating: number;
  content: string;
  userName: string;
  createdAt: Date;
};

export type OrderReviewRecord = {
  id: number;
  orderItemId: number;
  productId: number;
  rating: number;
  content: string;
  status: ReviewStatus;
  reviewNote: string | null;
  createdAt: Date;
};

export type AdminReviewRecord = OrderReviewRecord & {
  userId: string;
  userName: string;
  userEmail: string;
  productName: string;
  orderNo: string;
};

export type ReviewRepositoryCreateResult =
  | { status: "CREATED"; id: number }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ALREADY_REVIEWED" };

export type ReviewRepositoryDeleteResult =
  | { status: "DELETED" }
  | { status: "NOT_FOUND" };

export interface ReviewRepository {
  createReview(input: {
    userId: string;
    productId: number;
    orderItemId: number;
    rating: number;
    content: string;
    status: "APPROVED";
    now: Date;
  }): Promise<ReviewRepositoryCreateResult>;
  listPublic(productId: number): Promise<PublicReviewRecord[]>;
  listByOrder(userId: string, orderNo: string): Promise<OrderReviewRecord[]>;
  listAdmin(input: {
    status?: ReviewStatus;
    page: number;
    pageSize: number;
  }): Promise<{ items: AdminReviewRecord[]; total: number }>;
  deleteReview(reviewId: number): Promise<ReviewRepositoryDeleteResult>;
}

export function createReviewService(repository: ReviewRepository) {
  return {
    async createReview(input: {
      userId: string | null;
      userStatus?: "ACTIVE" | "FROZEN";
      productId: number;
      orderItemId: number;
      rating: number;
      content: string;
    }) {
      if (!input.userId) {
        return {
          ok: false as const,
          code: "UNAUTHORIZED" as const,
          message: "请先登录后评价商品",
        };
      }
      if (input.userStatus === "FROZEN") {
        return {
          ok: false as const,
          code: "ACCOUNT_FROZEN" as const,
          message: "账号已被冻结，暂时无法评价商品",
        };
      }
      const result = await repository.createReview({
        userId: input.userId,
        productId: input.productId,
        orderItemId: input.orderItemId,
        rating: input.rating,
        content: input.content,
        status: "APPROVED",
        now: new Date(),
      });
      if (result.status === "NOT_ELIGIBLE") {
        return {
          ok: false as const,
          code: "NOT_ELIGIBLE" as const,
          message: "仅已完成或已送达的已支付订单可评价",
        };
      }
      if (result.status === "ALREADY_REVIEWED") {
        return {
          ok: false as const,
          code: "ALREADY_REVIEWED" as const,
          message: "你已经评价过该商品",
        };
      }
      return { ok: true as const, reviewId: result.id, message: "评价已发布" };
    },

    listPublic(productId: number) {
      return repository.listPublic(productId);
    },

    listByOrder(userId: string | null, orderNo: string) {
      return userId ? repository.listByOrder(userId, orderNo) : Promise.resolve([] as OrderReviewRecord[]);
    },

    listAdmin(input: { status?: ReviewStatus; page: number; pageSize: number }) {
      return repository.listAdmin(input);
    },

    async deleteReview(input: { adminId: string | null; reviewId: number }) {
      if (!input.adminId) {
        return { ok: false as const, code: "FORBIDDEN" as const, message: "没有评价管理权限" };
      }
      if (!Number.isSafeInteger(input.reviewId) || input.reviewId <= 0) {
        return { ok: false as const, code: "INVALID_INPUT" as const, message: "评价参数不正确" };
      }
      const result = await repository.deleteReview(input.reviewId);
      return result.status === "DELETED"
        ? { ok: true as const, message: "评价已删除" }
        : { ok: false as const, code: "NOT_FOUND" as const, message: "评价不存在" };
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
