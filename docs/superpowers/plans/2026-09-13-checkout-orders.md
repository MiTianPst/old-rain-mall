# Checkout and Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将登录用户的可售购物车转换为包含商品、地址、会员折扣和金额快照的待支付订单，并提供查询、取消和两小时过期关闭能力。

**Architecture:** 金额与会员映射保持纯函数，订单服务表达业务结果，Drizzle 仓储承担原子下单、条件扣库存、取消及过期事务。结算与订单页面均为 Server Component，写操作通过重新鉴权的 Server Action 进入服务层。

**Tech Stack:** Next.js 16.3.5 App Router、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、Drizzle ORM 0.45.2、MySQL 8.4、Zod 4.6.2、Node test runner

**Spec:** `docs/superpowers/specs/2026-09-13-address-checkout-orders-payments-design.md`

## Global Constraints

- 本计划依赖 `2026-09-13-address-book.md` 已完成并迁移 `user_addresses`。
- UI 文案使用中文；金额只使用整数分，折扣只使用整数基点。
- 创建订单时不接受客户端价格、折扣、会员等级、运费或总金额。
- 创建订单、扣库存、写快照、创建支付单和清购物车必须在同一 MySQL 事务。
- 第一版运费固定为 0；待支付订单有效期固定为 2 小时。
- 用户只能读取和操作自己的订单；已支付订单不能由用户取消。

---

### Task 1: 会员规则与金额计算

**Files:**
- Create: `src/lib/membership.ts`
- Create: `src/lib/membership.test.ts`
- Create: `src/features/order/pricing.ts`
- Create: `src/features/order/pricing.test.ts`

**Interfaces:**
- Produces: `MembershipLevel = 0 | 1 | 2 | 3`。
- Produces: `getDiscountRateBps(level)`, `getMembershipLevel(lifetimePaidCents)`, `getMembershipLabel(level)`。
- Produces: `calculateOrderPricing({ originalAmountCents, membershipLevel })`，返回 `discountRateBps`, `memberDiscountCents`, `shippingFeeCents`, `totalCents`。

- [ ] **Step 1: 写会员门槛与跨级测试**

```ts
test("累计实付金额映射到最高心悦等级", () => {
  assert.equal(getMembershipLevel(799_999), 0);
  assert.equal(getMembershipLevel(800_000), 1);
  assert.equal(getMembershipLevel(8_000_000), 2);
  assert.equal(getMembershipLevel(80_000_000), 3);
});
```

- [ ] **Step 2: 写整数分折扣测试**

```ts
test("订单折扣向下取整到整数分且全部包邮", () => {
  assert.deepEqual(
    calculateOrderPricing({ originalAmountCents: 10_001, membershipLevel: 1 }),
    {
      discountRateBps: 9800,
      memberDiscountCents: 201,
      shippingFeeCents: 0,
      totalCents: 9_800,
    },
  );
});
```

- [ ] **Step 3: 运行纯函数测试确认失败**

Run: `npm.cmd exec tsx -- --test src/lib/membership.test.ts src/features/order/pricing.test.ts`

Expected: FAIL，会员与计价函数尚未定义。

- [ ] **Step 4: 实现规则常量与计算函数**

```ts
const MEMBERSHIP_RULES = [
  { level: 0, thresholdCents: 0, discountRateBps: 10_000, label: "普通会员" },
  { level: 1, thresholdCents: 800_000, discountRateBps: 9_800, label: "心悦1级" },
  { level: 2, thresholdCents: 8_000_000, discountRateBps: 9_500, label: "心悦2级" },
  { level: 3, thresholdCents: 80_000_000, discountRateBps: 9_000, label: "心悦3级" },
] as const;

const discounted = Math.floor(originalAmountCents * discountRateBps / 10_000);
```

实现必须校验输入为安全的非负整数；数据库读取到非法会员等级时返回明确错误，不静默套用折扣。

- [ ] **Step 5: 运行测试确认通过并提交**

Run: `npm.cmd exec tsx -- --test src/lib/membership.test.ts src/features/order/pricing.test.ts`

Expected: PASS。

```powershell
git add src/lib/membership.ts src/lib/membership.test.ts src/features/order/pricing.ts src/features/order/pricing.test.ts
git commit -m "feat: 添加会员等级与订单计价规则"
```

### Task 2: 订单服务契约与状态规则

**Files:**
- Create: `src/server/services/order-service.ts`
- Create: `src/server/services/order-service.test.ts`
- Create: `src/features/order/schema.ts`
- Create: `src/features/order/schema.test.ts`

**Interfaces:**
- Produces: `OrderRepository` 方法 `getCheckout`, `create`, `listByUser`, `getByOrderNo`, `cancel`, `closeExpiredForUser`, `closeExpiredBatch`。
- Produces: `createOrderService(repository, { now })`。
- Service methods: `getCheckout(userId)`, `createOrder({ userId, addressId })`, `listOrders(userId)`, `getOrder({ userId, orderNo })`, `cancelOrder({ userId, orderNo })`, `closeExpiredForUser(userId)`, `closeExpiredBatch(limit)`。
- 业务错误码: `UNAUTHORIZED`, `ADDRESS_NOT_FOUND`, `EMPTY_CART`, `PRODUCT_UNAVAILABLE`, `STOCK_EXCEEDED`, `ORDER_NOT_FOUND`, `ORDER_NOT_CANCELLABLE`, `ORDER_EXPIRED`。

- [ ] **Step 1: 写订单输入和状态映射测试**

覆盖正整数地址 ID、订单号长度与字符集；未登录创建订单返回 `UNAUTHORIZED`；仓储库存错误携带商品名并映射为中文；非待支付取消返回 `ORDER_NOT_CANCELLABLE`。

- [ ] **Step 2: 运行服务测试确认失败**

Run: `npm.cmd exec tsx -- --test src/features/order/schema.test.ts src/server/services/order-service.test.ts`

Expected: FAIL，订单 Schema 与服务尚未定义。

- [ ] **Step 3: 实现订单服务**

服务不直接访问 Drizzle。创建订单成功返回 `{ ok: true, orderNo }`；失败返回可区分的错误码和中文消息。读取订单前调用 `closeExpiredForUser`，确保本地无定时任务时也会释放该用户过期库存。

- [ ] **Step 4: 运行服务测试确认通过并提交**

Run: 使用 Step 2 的命令。

Expected: PASS。

```powershell
git add src/features/order/schema.ts src/features/order/schema.test.ts src/server/services/order-service.ts src/server/services/order-service.test.ts
git commit -m "feat: 定义订单服务与状态规则"
```

### Task 3: 原子下单仓储

**Files:**
- Create: `src/server/repositories/order-repository.ts`
- Create: `src/server/repositories/order-repository.integration.test.ts`
- Create: `src/server/orders.ts`

**Interfaces:**
- Consumes: `OrderRepository`、`calculateOrderPricing`、`userAddresses`、`users`、`cartItems`、`products`、`categories`、`orders`、`orderItems`、`payments`。
- Produces: `orderRepository` 和绑定后的 `orderService`。
- `create` 输入只含 `{ userId, addressId, now, expiresAt, orderNo, paymentNo }`。

- [ ] **Step 1: 写真实 MySQL 下单成功测试**

建立隔离用户、默认地址、两个在售商品和购物车，调用仓储后断言：订单为 `PENDING_PAYMENT`；地址、商品名、图片、单价、数量、会员等级和折扣均为快照；库存正确扣减；支付单为 `PENDING` 且金额等于订单；购物车已清空；`expiresAt - createdAt` 约为两小时。

- [ ] **Step 2: 写事务回滚测试**

覆盖隐藏分类、下架商品和库存不足。断言仓储返回具体失败状态，且没有新增订单或支付记录、库存不变、购物车不变。

- [ ] **Step 3: 运行数据库测试确认失败**

Run:

```powershell
$env:RUN_DB_TESTS='1'
$env:NODE_OPTIONS='--conditions=react-server'
npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/order-repository.integration.test.ts
```

Expected: FAIL，订单仓储尚未实现。

- [ ] **Step 4: 实现原子下单事务**

事务锁定用户、地址、购物车和商品。商品按 ID 升序处理；每个库存更新必须包含：

```ts
where(and(
  eq(products.id, item.productId),
  eq(products.status, "ACTIVE"),
  gte(products.stock, item.quantity),
))
```

任一 `affectedRows !== 1` 抛出内部事务回滚错误，并在事务外映射为业务结果。只有所有库存扣减成功后才写订单、订单项、支付记录并删除本次购物车条目。编号唯一冲突由外层最多重试 3 次，每次完整重启事务。

- [ ] **Step 5: 运行数据库测试确认通过并提交**

Run: 使用 Step 3 的命令。

Expected: PASS，测试 finally 清理隔离数据并关闭测试连接池。

```powershell
git add src/server/repositories/order-repository.ts src/server/repositories/order-repository.integration.test.ts src/server/orders.ts
git commit -m "feat: 实现原子下单事务"
```

### Task 4: 取消与过期库存恢复

**Files:**
- Modify: `src/server/repositories/order-repository.ts`
- Modify: `src/server/repositories/order-repository.integration.test.ts`
- Create: `src/app/api/jobs/expire-orders/route.ts`
- Create: `src/app/api/jobs/expire-orders/route.test.ts`
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

**Interfaces:**
- `cancel({ userId, orderNo, now })` 只允许所属订单 `PENDING_PAYMENT -> CANCELLED`。
- `closeExpiredForUser({ userId, now })` 关闭该用户已过期订单。
- `closeExpiredBatch({ now, limit })` 每批最多处理 100 条。
- Route Handler 使用 `Authorization: Bearer <ORDER_EXPIRATION_JOB_SECRET>`。

- [ ] **Step 1: 扩展集成测试验证库存只恢复一次**

创建待支付订单后先取消两次，断言第一次成功、第二次返回状态冲突，库存只增加一次。另建已过期订单，重复执行关闭批次，断言状态为 `CLOSED` 且库存只恢复一次。已支付订单不允许取消或关闭。

- [ ] **Step 2: 运行测试确认失败**

Run: 使用 Task 3 Step 3 的数据库测试命令。

Expected: FAIL，取消和关闭方法尚未实现。

- [ ] **Step 3: 实现取消与关闭事务**

每次事务先以 `SELECT ... FOR UPDATE` 锁定订单，再判断状态。只有当前状态为 `PENDING_PAYMENT` 时修改状态并遍历订单项恢复库存。过期关闭额外要求 `expiresAt <= now`。更新支付单为 `FAILED`，但不修改用户累计金额。

- [ ] **Step 4: 实现任务 Route Handler**

未配置任务密钥时返回 503；Authorization 不匹配返回 401；成功调用 `orderService.closeExpiredBatch(100)` 并返回 `{ closedCount }`。使用 `crypto.timingSafeEqual` 比较等长密钥，避免直接字符串比较。

- [ ] **Step 5: 运行集成与 Route 测试并提交**

Run:

```powershell
npm.cmd test
$env:RUN_DB_TESTS='1'; $env:NODE_OPTIONS='--conditions=react-server'; npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/order-repository.integration.test.ts
```

Expected: 全部 PASS。

```powershell
git add src/server/repositories/order-repository.ts src/server/repositories/order-repository.integration.test.ts src/app/api/jobs/expire-orders/route.ts src/lib/env.ts .env.example
git commit -m "feat: 支持取消和关闭过期订单"
```

### Task 5: 结算、订单列表和详情页面

**Files:**
- Create: `src/app/actions/order.ts`
- Create: `src/features/order/checkout-form.tsx`
- Create: `src/features/order/cancel-order-button.tsx`
- Create: `src/features/order/order-action-input.test.ts`
- Modify: `src/app/checkout/page.tsx`
- Create: `src/app/orders/page.tsx`
- Create: `src/app/orders/[orderNo]/page.tsx`
- Modify: `src/features/site/site-header.tsx`
- Modify: `src/app/cart/page.tsx`

**Interfaces:**
- Actions: `createOrderAction(previousState, formData)`, `cancelOrderAction(previousState, formData)`。
- Action state: `{ status: "IDLE" | "SUCCESS" | "ERROR"; message: string; orderNo?: string }`。
- 订单详情使用 `PageProps<'/orders/[orderNo]'>` 并 `await props.params`。

- [ ] **Step 1: 写 Action 输入边界测试**

覆盖非法地址 ID、非法订单号、未登录和服务层错误映射，确保客户端无法提交金额、等级或库存字段。

- [ ] **Step 2: 运行 Action 测试确认失败**

Run: `npm.cmd exec tsx -- --test src/features/order/order-action-input.test.ts`

Expected: FAIL，输入转换函数尚未实现。

- [ ] **Step 3: 实现订单 Actions**

创建成功时先刷新 `/cart`、`/checkout`、`/orders`，再 `redirect(`/orders/${orderNo}`)`；取消成功刷新订单列表和对应详情。每个 Action 内调用 `getCurrentSession()` 并使用 Session 用户 ID。

- [ ] **Step 4: 实现结算页**

结算页并行读取地址与结算 DTO。没有地址时展示新增地址入口；购物车为空时展示返回商城入口；有效时展示地址单选、商品清单、当前会员等级、原价、会员优惠、包邮和应付金额。提交按钮使用 pending 状态防止用户连续点击。

- [ ] **Step 5: 实现订单列表与详情**

订单列表展示订单号、创建时间、状态、商品摘要和实付金额。详情展示地址快照、商品快照、金额明细、两小时支付截止时间；只有待支付且未过期订单展示取消按钮，模拟支付按钮由后续支付计划接入。

- [ ] **Step 6: 运行完整验证并提交**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: 所有命令退出码为 0；真实浏览器可从购物车进入结算、选地址、创建订单、查看详情并取消订单，库存恢复一次。

```powershell
git add src/app/actions/order.ts src/app/checkout src/app/orders src/features/order src/features/site/site-header.tsx src/app/cart/page.tsx
git commit -m "feat: 完成结算与用户订单页面"
```
