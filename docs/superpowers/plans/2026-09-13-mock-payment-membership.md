# Mock Payment and Membership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为待支付订单提供可替换的模拟支付适配器，通过幂等事务确认支付、累计实付金额、升级心悦等级并展示支付结果。

**Architecture:** `PaymentProvider` 隔离渠道行为，`paymentService` 编排支付并映射业务错误，Drizzle 支付仓储实现订单、支付单和用户的锁定更新。会员等级计算复用结算计划中的纯函数，未来支付回调调用同一确认事务。

**Tech Stack:** Next.js 16.3.5 App Router、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、Drizzle ORM 0.45.2、MySQL 8.4、Zod 4.6.2、Node test runner

**Spec:** `docs/superpowers/specs/2026-09-13-address-checkout-orders-payments-design.md`

## Global Constraints

- 本计划依赖地址簿和结算订单计划已经完成。
- 模拟支付只允许当前登录用户支付自己的 `PENDING_PAYMENT` 订单。
- 过期订单绝对不能支付；关闭与恢复库存必须在支付确认事务内完成。
- 支付确认必须幂等，同一订单只能累计一次实付金额并最多生成一条升级流水。
- 当前订单使用支付前会员等级，升级后的折扣从下一笔订单生效。
- 支付渠道不得直接修改订单、库存或会员数据。

---

### Task 1: 支付渠道字段迁移

**Files:**
- Modify: `src/db/schema/commerce.ts`
- Create: `drizzle/0002_*.sql`（由 Drizzle Kit 生成，使用实际生成文件名）
- Modify: `drizzle/meta/_journal.json`
- Create: `drizzle/meta/0002_snapshot.json`

**Interfaces:**
- Produces: `payments.providerTradeNo: varchar(128) | null`。
- Produces: `payments_provider_trade_no_unique` 唯一索引，允许多个 `NULL`，阻止同一第三方交易号重复入账。

- [ ] **Step 1: 扩展支付表**

```ts
providerTradeNo: varchar("provider_trade_no", { length: 128 }),
```

在表索引中加入：

```ts
uniqueIndex("payments_provider_trade_no_unique").on(table.providerTradeNo),
```

- [ ] **Step 2: 生成并审查迁移**

Run: `npm.cmd run db:generate`

Expected: 迁移只为 `payments` 增加字段和唯一索引，不删除或重建订单数据。

- [ ] **Step 3: 执行迁移**

Run: `npm.cmd run db:migrate`

Expected: 退出码为 0，现有支付记录保留且新字段可空。

- [ ] **Step 4: 提交迁移**

```powershell
git add src/db/schema/commerce.ts drizzle
git commit -m "feat: 为真实支付预留渠道交易号"
```

### Task 2: 支付适配器与服务契约

**Files:**
- Create: `src/server/payments/provider.ts`
- Create: `src/server/payments/mock-provider.ts`
- Create: `src/server/payments/mock-provider.test.ts`
- Create: `src/server/services/payment-service.ts`
- Create: `src/server/services/payment-service.test.ts`

**Interfaces:**
- Produces: `PaymentOrder`, `PaymentCreation`, `PaymentResult`, `PaymentProvider`。
- Produces: `MockPaymentProvider`，渠道名为 `MOCK`。
- Produces: `PaymentRepository.getPayableOrder({ userId, orderNo, now })` 与 `PaymentRepository.confirm({ userId, orderNo, providerResult, now })`。
- Produces: `createPaymentService({ repository, provider, now })`，方法 `pay({ userId, orderNo })`。

- [ ] **Step 1: 写支付适配器测试**

```ts
test("模拟支付使用商城支付单号生成成功结果", async () => {
  const result = await mockPaymentProvider.createPayment({
    orderNo: "OR202609130001",
    paymentNo: "PAY202609130001",
    amountCents: 9800,
  });
  assert.deepEqual(result, {
    status: "SUCCESS",
    paymentNo: "PAY202609130001",
    amountCents: 9800,
    providerTradeNo: null,
  });
});
```

- [ ] **Step 2: 写支付服务测试**

覆盖未登录、订单不存在、非待支付、订单过期、金额不一致、首次支付成功、重复支付返回原成功结果。断言 provider 只负责产生支付结果，数据库确认由 repository 完成。

- [ ] **Step 3: 运行测试确认失败**

Run: `npm.cmd exec tsx -- --test src/server/payments/mock-provider.test.ts src/server/services/payment-service.test.ts`

Expected: FAIL，支付接口和服务尚未定义。

- [ ] **Step 4: 实现适配器和服务**

```ts
export interface PaymentProvider {
  readonly method: "MOCK";
  createPayment(order: PaymentOrder): Promise<PaymentCreation>;
  verifyCallback(payload: unknown): Promise<PaymentResult>;
}
```

`MockPaymentProvider.createPayment` 返回成功；`verifyCallback` 使用 Zod 解析同一结构，供测试和未来回调契约演进。服务先让仓储读取当前用户待支付订单 DTO，再调用 provider，最后把渠道结果交给确认事务。

- [ ] **Step 5: 运行测试确认通过并提交**

Run: 使用 Step 3 的命令。

Expected: PASS。

```powershell
git add src/server/payments src/server/services/payment-service.ts src/server/services/payment-service.test.ts
git commit -m "feat: 添加可替换模拟支付适配器"
```

### Task 3: 幂等支付确认与会员升级事务

**Files:**
- Create: `src/server/repositories/payment-repository.ts`
- Create: `src/server/repositories/payment-repository.integration.test.ts`
- Create: `src/server/payments.ts`
- Modify: `src/server/repositories/order-repository.ts`

**Interfaces:**
- Consumes: `orders`, `orderItems`, `payments`, `users`, `membershipLevelLogs`, `products`, `getMembershipLevel`。
- Produces: `paymentRepository` 和绑定 `MockPaymentProvider` 后的 `paymentService`。
- Confirmation result statuses: `PAID`, `ALREADY_PAID`, `ORDER_NOT_FOUND`, `ORDER_EXPIRED`, `INVALID_STATE`, `AMOUNT_MISMATCH`。

- [ ] **Step 1: 写首次支付与升级集成测试**

创建当前等级为 0、累计实付为 790000 分的用户和总额 20000 分的待支付订单。支付后断言：支付单和订单均为成功；用户累计为 810000 分并升到心悦 1 级；订单会员等级快照仍为 0；升级流水从 0 到 1 且关联该订单。

- [ ] **Step 2: 写幂等与跨级测试**

对同一订单连续确认两次，断言第二次返回 `ALREADY_PAID`，累计金额不再增加，升级流水仍只有一条。另建大额订单，断言用户可从 0 直接升级到满足门槛的最高等级。

- [ ] **Step 3: 写过期拒付测试**

创建已过期待支付订单，调用确认后断言订单为 `CLOSED`、支付为 `FAILED`、库存恢复一次、累计实付和会员等级不变；再次确认不重复恢复库存。

- [ ] **Step 4: 运行数据库测试确认失败**

Run:

```powershell
$env:RUN_DB_TESTS='1'
$env:NODE_OPTIONS='--conditions=react-server'
npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/payment-repository.integration.test.ts
```

Expected: FAIL，支付仓储尚未实现。

- [ ] **Step 5: 实现支付确认事务**

事务按订单、支付单、用户顺序 `FOR UPDATE` 锁定记录。先处理已经成功的幂等分支，再判断 `expiresAt <= now` 并调用共享的关闭订单事务函数。仅在订单 `PENDING_PAYMENT`、支付 `PENDING` 且金额完全一致时执行成功更新。

用户累计与等级更新使用数据库锁定后的原值：

```ts
const nextLifetimePaidCents = user.lifetimePaidCents + order.totalCents;
const nextLevel = getMembershipLevel(nextLifetimePaidCents);
```

先更新支付和订单，再更新用户；只有 `nextLevel > currentLevel` 时插入 `membershipLevelLogs`。唯一索引冲突视为重复确认并重新读取最终结果，不重复累计。

- [ ] **Step 6: 运行数据库测试确认通过并提交**

Run: 使用 Step 4 的命令。

Expected: PASS，所有临时订单、支付、升级流水和用户均由测试清理。

```powershell
git add src/server/repositories/payment-repository.ts src/server/repositories/payment-repository.integration.test.ts src/server/repositories/order-repository.ts src/server/payments.ts
git commit -m "feat: 实现幂等支付与会员升级事务"
```

### Task 4: 模拟支付操作与会员结果展示

**Files:**
- Create: `src/app/actions/payment.ts`
- Create: `src/features/payment/mock-payment-button.tsx`
- Create: `src/features/payment/payment-action-input.test.ts`
- Modify: `src/app/orders/[orderNo]/page.tsx`
- Modify: `src/app/orders/page.tsx`
- Modify: `src/features/auth/user-navigation.tsx`

**Interfaces:**
- Action: `mockPayAction(previousState, formData)`。
- Action state: `{ status: "IDLE" | "SUCCESS" | "ERROR"; message: string; membershipLevel?: MembershipLevel }`。
- Action 只接收 `orderNo`；用户 ID、支付金额和会员等级均从服务端读取。

- [ ] **Step 1: 写支付 Action 输入测试**

覆盖空订单号、超长订单号、非法字符和合法商城订单号；断言输入中即使带有 `amountCents` 或 `membershipLevel` 也不会传入服务层。

- [ ] **Step 2: 运行输入测试确认失败**

Run: `npm.cmd exec tsx -- --test src/features/payment/payment-action-input.test.ts`

Expected: FAIL，支付 Action 输入解析尚未定义。

- [ ] **Step 3: 实现模拟支付 Action**

Action 内重新获取 Session、Zod 校验订单号并调用 `paymentService.pay`。成功后刷新 `/orders`、当前订单详情、`/checkout` 和用户导航相关页面；返回“支付成功”以及支付后的会员等级。失败只返回中文业务错误，不返回数据库异常。

- [ ] **Step 4: 实现支付按钮和结果展示**

按钮使用 `useActionState`，pending 时显示“支付处理中…”。只在服务端订单 DTO 表明 `PENDING_PAYMENT` 且未过期时渲染。成功后页面重渲染为已支付状态，并展示新会员等级；重复提交显示已支付结果而不是错误。

- [ ] **Step 5: 更新订单与用户导航**

订单列表和详情使用统一中文状态标签。用户导航展示“普通会员/心悦 1 级/心悦 2 级/心悦 3 级”，并显示累计实付金额；不得在 Client Component 中重新计算会员等级。

- [ ] **Step 6: 运行完整验证并提交**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: 所有命令退出码为 0；真实浏览器可创建订单、点击模拟支付、看到订单已支付和会员升级，重复点击不会重复累计。

```powershell
git add src/app/actions/payment.ts src/features/payment src/app/orders src/features/auth/user-navigation.tsx
git commit -m "feat: 完成模拟支付与会员展示"
```

### Task 5: 全交易链路验收

**Files:**
- Modify: `CLAUDE.md`
- Test: `src/server/repositories/address-repository.integration.test.ts`
- Test: `src/server/repositories/order-repository.integration.test.ts`
- Test: `src/server/repositories/payment-repository.integration.test.ts`

**Interfaces:**
- Verifies: 地址簿、结算、订单、库存、模拟支付和会员升级的最终公开行为。
- Produces: 更新后的项目状态与可复现验证命令。

- [ ] **Step 1: 运行全部普通测试**

Run: `npm.cmd test`

Expected: 0 failures；数据库集成测试在未设置 `RUN_DB_TESTS=1` 时明确标记为 SKIP。

- [ ] **Step 2: 串行运行全部 MySQL 集成测试**

Run:

```powershell
$env:RUN_DB_TESTS='1'
$env:NODE_OPTIONS='--conditions=react-server'
npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/address-repository.integration.test.ts
npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/order-repository.integration.test.ts
npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/payment-repository.integration.test.ts
```

Expected: 三组测试全部 PASS，MySQL 容器保持 healthy。

- [ ] **Step 3: 运行静态与生产构建检查**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: 全部退出码为 0，Next.js 构建列出地址、结算、订单和任务 API 路由。

- [ ] **Step 4: 手动验收两类会员路径**

普通用户完成“新增地址 → 加入购物车 → 结算 → 创建订单 → 模拟支付”；测试用户通过隔离测试数据完成跨级升级。核对订单地址和商品快照、库存变化、累计实付、会员等级以及重复支付结果。

- [ ] **Step 5: 更新项目说明并提交**

把 `CLAUDE.md` 当前状态更新为已完成地址簿、结算、订单、模拟支付和会员升级，并记录两小时有效期、全部包邮及验证命令。

```powershell
git add CLAUDE.md
git commit -m "docs: 更新交易与会员模块状态"
```
