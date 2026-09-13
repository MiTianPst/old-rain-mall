export type PaymentOrder = {
  orderNo: string;
  paymentNo: string;
  amountCents: number;
};

export type PaymentCreation = {
  status: "SUCCESS" | "FAILED";
  paymentNo: string;
  amountCents: number;
  providerTradeNo: string | null;
};

export type PaymentResult = PaymentCreation;

export interface PaymentProvider {
  readonly method: "MOCK";
  createPayment(order: PaymentOrder): Promise<PaymentCreation>;
  verifyCallback(payload: unknown): Promise<PaymentResult>;
}
