import "server-only";

import { env } from "@/lib/env";
import { mockPaymentProvider } from "@/server/payments/mock-provider";
import { wechatNativePaymentProvider } from "@/server/payments/wechat-native-provider";
import { paymentRepository } from "@/server/repositories/payment-repository";
import { createPaymentService } from "@/server/services/payment-service";

export const paymentProvider = env.PAYMENT_PROVIDER === "WECHAT_NATIVE"
  ? wechatNativePaymentProvider
  : mockPaymentProvider;
export const paymentMethod = paymentProvider.method;

export const paymentService = createPaymentService({
  repository: paymentRepository,
  provider: paymentProvider,
});
