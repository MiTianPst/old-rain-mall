import "server-only";

import { reviewRepository } from "./repositories/review-repository";
import { createReviewService } from "./services/review-service";

export const reviewService = createReviewService(reviewRepository);
