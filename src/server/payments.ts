import "server-only";

import { mockPaymentProvider } from "@/server/payments/mock-provider";
import { paymentRepository } from "@/server/repositories/payment-repository";
import { createPaymentService } from "@/server/services/payment-service";

export const paymentService = createPaymentService({
  repository: paymentRepository,
  provider: mockPaymentProvider,
});
