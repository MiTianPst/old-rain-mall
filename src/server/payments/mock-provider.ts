import { z } from "zod";

import type {
  PaymentCreation,
  PaymentOrder,
  PaymentProvider,
  PaymentResult,
} from "./provider";

const paymentResultSchema = z.object({
  status: z.enum(["SUCCESS", "FAILED"]),
  paymentNo: z.string().min(1).max(32),
  amountCents: z.number().int().nonnegative(),
  providerTradeNo: z.string().max(128).nullable(),
});

export class MockPaymentProvider implements PaymentProvider {
  readonly method = "MOCK" as const;

  async createPayment(order: PaymentOrder): Promise<PaymentCreation> {
    return {
      status: "SUCCESS",
      paymentNo: order.paymentNo,
      amountCents: order.amountCents,
      providerTradeNo: null,
    };
  }

  async queryPayment(order: PaymentOrder): Promise<PaymentResult> {
    return {
      status: "SUCCESS",
      paymentNo: order.paymentNo,
      amountCents: order.amountCents,
      providerTradeNo: null,
    };
  }

  async verifyCallback(payload: unknown): Promise<PaymentResult> {
    return paymentResultSchema.parse(payload);
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
