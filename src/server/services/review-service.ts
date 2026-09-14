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

export interface ReviewRepository {
  createReview(input: {
    userId: string;
    productId: number;
    orderItemId: number;
    rating: number;
    content: string;
    now: Date;
  }): Promise<ReviewRepositoryCreateResult>;
  listPublic(productId: number): Promise<PublicReviewRecord[]>;
  listByOrder(userId: string, orderNo: string): Promise<OrderReviewRecord[]>;
  listAdmin(input: {
    status?: ReviewStatus;
    page: number;
    pageSize: number;
  }): Promise<{ items: AdminReviewRecord[]; total: number }>;
  moderate(input: {
    adminId: string;
    reviewId: number;
    status: Exclude<ReviewStatus, "PENDING">;
    note: string | null;
    now: Date;
  }): Promise<{ status: "UPDATED" | "NOT_FOUND" }>;
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
      return { ok: true as const, reviewId: result.id, message: "评价已提交，审核通过后将公开展示" };
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

    async moderate(input: {
      adminId: string | null;
      reviewId: number;
      status: Exclude<ReviewStatus, "PENDING">;
      note?: string;
    }) {
      if (!input.adminId) {
        return { ok: false as const, code: "FORBIDDEN" as const, message: "没有评价审核权限" };
      }
      const result = await repository.moderate({
        adminId: input.adminId,
        reviewId: input.reviewId,
        status: input.status,
        note: input.note?.trim() || null,
        now: new Date(),
      });
      return result.status === "UPDATED"
        ? { ok: true as const, message: "评价审核状态已更新" }
        : { ok: false as const, code: "NOT_FOUND" as const, message: "评价不存在" };
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
