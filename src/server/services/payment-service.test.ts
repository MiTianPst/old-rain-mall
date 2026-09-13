import assert from "node:assert/strict";
import test from "node:test";

import { MockPaymentProvider } from "@/server/payments/mock-provider";
import {
  createPaymentService,
  type PaymentConfirmationResult,
  type PaymentRepository,
  type PayableOrderResult,
} from "./payment-service";

function makeRepository(input: {
  payable: PayableOrderResult;
  confirmed?: PaymentConfirmationResult;
}) {
  let confirmCalls = 0;
  const repository: PaymentRepository = {
    async getPayableOrder() { return input.payable; },
    async confirm() { confirmCalls += 1; return input.confirmed ?? { status: "PAID", membershipLevel: 1 }; },
  };
  return { repository, getConfirmCalls: () => confirmCalls };
}

test("模拟支付返回商城支付单号和原始金额", async () => {
  const provider = new MockPaymentProvider();
  assert.deepEqual(await provider.createPayment({ orderNo: "OR202609130001", paymentNo: "PAY202609130001", amountCents: 9800 }), {
    status: "SUCCESS", paymentNo: "PAY202609130001", amountCents: 9800, providerTradeNo: null,
  });
});

test("支付服务拒绝未登录和过期订单", async () => {
  const fixture = makeRepository({ payable: { status: "ORDER_EXPIRED" } });
  const service = createPaymentService({ repository: fixture.repository, provider: new MockPaymentProvider(), now: () => new Date("2026-09-14T00:00:00Z") });
  const unauthorized = await service.pay({ userId: null, orderNo: "OR202609130001" });
  assert.equal(unauthorized.ok, false);
  if (!unauthorized.ok) assert.equal(unauthorized.code, "UNAUTHORIZED");
  const expired = await service.pay({ userId: "user-1", orderNo: "OR202609130001" });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.code, "ORDER_EXPIRED");
  assert.equal(fixture.getConfirmCalls(), 0);
});

test("重复支付直接返回成功且不再次确认", async () => {
  const fixture = makeRepository({ payable: { status: "ALREADY_PAID", membershipLevel: 2 } });
  const service = createPaymentService({ repository: fixture.repository, provider: new MockPaymentProvider() });
  const result = await service.pay({ userId: "user-1", orderNo: "OR202609130001" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.membershipLevel, 2);
  assert.equal(fixture.getConfirmCalls(), 0);
});

test("首次支付只由仓储确认并返回支付后等级", async () => {
  const fixture = makeRepository({ payable: { status: "PAYABLE", order: { orderNo: "OR202609130001", paymentNo: "PAY202609130001", amountCents: 20_000 } }, confirmed: { status: "PAID", membershipLevel: 1 } });
  const service = createPaymentService({ repository: fixture.repository, provider: new MockPaymentProvider() });
  const result = await service.pay({ userId: "user-1", orderNo: "OR202609130001" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.membershipLevel, 1);
  assert.equal(fixture.getConfirmCalls(), 1);
});
