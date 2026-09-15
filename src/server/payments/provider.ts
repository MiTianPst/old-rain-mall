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
  codeUrl?: string;
};

export type PaymentResult = {
  status: "SUCCESS" | "FAILED";
  paymentNo?: string;
  orderNo?: string;
  amountCents: number;
  providerTradeNo: string | null;
};

export interface PaymentProvider {
  readonly method: "MOCK" | "WECHAT_NATIVE";
  createPayment(order: PaymentOrder): Promise<PaymentCreation>;
  verifyCallback(payload: unknown): Promise<PaymentResult>;
  queryPayment?(order: PaymentOrder): Promise<PaymentResult>;
}
