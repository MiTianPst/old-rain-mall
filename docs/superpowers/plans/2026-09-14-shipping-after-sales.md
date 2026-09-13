# 物流与售后实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在一期 SKU 与库存流水基础上交付一单一物流、运输状态模拟、用户确认收货、订单级售后申请、管理员审核和幂等模拟退款。

**Architecture:** 保持 Next.js 16 模块化单体结构，Server Component 读取订单、物流和售后 DTO，Server Action 承担用户与管理员写入。`shipment-service` 和 `after-sale-service` 定义状态机与权限，Drizzle 仓储在 MySQL 事务内同步 `orders`、`shipments`、`after_sales`、`payments`、`product_variants` 和 `inventory_transactions`。

**Tech Stack:** Next.js 16.3.5 App Router、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、MySQL 8.4、Drizzle ORM 0.45.2、Zod 4.6.2、Node.js 24、npm。

**Spec:** `docs/superpowers/specs/2026-09-14-operations-upgrade-design.md`（第 3.4、3.5、4、5、6、7、8 节）

## Global Constraints

- 本期以一期的 `product_variants`、`order_items.variant_id`、SKU 快照和 `inventory_transactions` 为已完成前置；不得回退到 `products.stock` 或 `products.price_cents`。
- 页面默认使用 Server Component；交互组件只处理状态和事件；用户、管理员写入使用 Server Action。
- 用户订单、物流和售后查询必须同时带当前 Session 的 `userId`；所有管理员读写入口重新调用 `getAdminSession`。
- 金额统一使用整数分；退款金额由服务端读取订单 `totalCents`，不接受浏览器金额。
- 每次订单、物流、支付、售后、SKU 库存和 `REFUND_RESTORE` 流水的关联修改必须处于同一 MySQL 事务。
- 每单仅允许一条 `shipments` 和一条第一版订单级 `after_sales` 记录；退款库存流水的幂等键唯一索引与条件状态更新共同保证重复点击幂等。
- 退款不再次累计或改写 `users.lifetimePaidCents`、`membershipLevel` 与既有升级流水；本期不实现会员降级。
- 面向用户的文案和 Zod 错误使用中文；服务端异常不返回数据库堆栈。
- 不新增运行时依赖，不连接第三方物流或退款服务，不混入第三期用户状态、审计日志和运营看板 Schema。
- 本期仅保留功能、状态与权限边界测试，以及 `npm test`、`npm run test:db`、`npm run lint`、`npm run typecheck`、`npm run build` 常规验证。

## 文件结构与职责

- Modify: `src/db/schema/commerce.ts` — 扩展订单/支付状态，定义物流与售后表。
- Modify: `src/db/schema/index.ts` — 继续导出 commerce Schema。
- Create: `src/features/shipping/schema.ts` — 物流表单白名单。
- Create: `src/features/after-sale/schema.ts` — 用户申请和管理员审核白名单。
- Create: `src/server/services/shipment-service.ts` — 发货、模拟运输、确认收货状态机。
- Create: `src/server/repositories/shipment-repository.ts` — 物流事务与按订单读取。
- Create: `src/server/shipments.ts` — 默认物流服务实例。
- Create: `src/app/actions/shipment.ts` — 用户确认收货 Action。
- Modify: `src/app/actions/admin-order.ts` — 录入物流和模拟运输 Action。
- Modify: `src/features/admin/order-status-actions.tsx` — 发货和运输状态表单。
- Create: `src/features/order/confirm-receipt-button.tsx` — 用户确认收货交互。
- Create: `src/server/services/after-sale-service.ts` — 申请、审核和模拟退款规则。
- Create: `src/server/repositories/after-sale-repository.ts` — 售后查询与退款事务。
- Create: `src/server/after-sales.ts` — 默认售后服务实例。
- Create: `src/app/actions/after-sale.ts` — 用户申请和管理员审核/退款 Action。
- Create: `src/features/order/after-sale-form.tsx` — 用户售后申请表单。
- Create: `src/features/admin/after-sale-actions.tsx` — 审核和退款表单。
- Modify: `src/server/services/order-service.ts`、`src/server/repositories/order-repository.ts` — 用户订单 DTO 附带物流和售后快照。
- Modify: `src/server/services/admin-order-service.ts`、`src/server/repositories/admin-order-repository.ts` — 后台订单 DTO 附带物流和售后快照。
- Modify: `src/app/orders/[orderNo]/page.tsx`、`src/app/admin/(protected)/orders/[orderNo]/page.tsx` — 展示与操作入口。
- Modify: `src/features/order/presentation.ts` — 新状态中文标签。
- Create: `src/server/services/shipment-service.test.ts`、`src/server/services/after-sale-service.test.ts` — 规则与权限测试。
- Create: `src/server/repositories/shipping-after-sales.integration.test.ts` — MySQL 状态机、库存恢复和幂等集成测试。
- Modify: `package.json` — 将新集成测试加入 `test:db`。
- Create: the next Drizzle Kit SQL file in `drizzle/`（本计划开始时序号应为 `0004`，保留工具生成的完整文件名）。

---

### Task 1: 扩展物流、售后和退款 Schema

**Files:**
- Modify: `src/db/schema/commerce.ts`
- Modify: `src/db/schema/index.ts`
- Create: `src/server/repositories/shipping-after-sales.integration.test.ts`
- Modify: `package.json`
- Create: the Drizzle Kit generated `0004` SQL file under `drizzle/`

**Interfaces:**
- Produces: `shipmentStatuses = ["PENDING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] as const`。
- Produces: `afterSaleStatuses = ["REQUESTED", "APPROVED", "REJECTED", "REFUNDING", "REFUNDED"] as const`。
- Extends: `orderStatuses` 增加 `IN_TRANSIT`、`DELIVERED`、`REFUNDED`；`paymentStatuses` 增加 `REFUNDED`。
- Produces: `shipments` 以 `orderId` 唯一；`afterSales` 以 `orderId` 唯一，符合第一版每单一条售后记录。
- Extends: `inventoryTransactions.idempotencyKey: string | null` 及唯一索引；退款键格式为 `AFTER_SALE:<afterSaleId>:VARIANT:<variantId>`，一期既有流水保持 `null`。

- [ ] **Step 1: 写 Schema 失败测试**

在 `shipping-after-sales.integration.test.ts` 中用独立订单数据断言物流与售后可插入，且同一订单的第二条记录触发唯一约束：

~~~ts
const [shipment] = await db.insert(schema.shipments).values({
  orderId,
  carrier: "顺丰速运",
  trackingNo: `SF${suffix}`,
  status: "SHIPPED",
  shippedAt: now,
}).$returningId();
assert.ok(shipment.id);

const [afterSale] = await db.insert(schema.afterSales).values({
  orderId,
  userId,
  reason: "商品破损",
  description: "外包装和商品均有明显破损",
  status: "REQUESTED",
  refundAmountCents: 12_900,
}).$returningId();
assert.ok(afterSale.id);
~~~

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/shipping-after-sales.integration.test.ts`

Expected: FAIL，提示 `shipments`、`afterSales` 或新增枚举尚未导出。

- [ ] **Step 3: 定义表和约束**

在 `commerce.ts` 中新增：

~~~ts
export const shipments = mysqlTable("shipments", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  orderId: int("order_id", { unsigned: true }).notNull().references(() => orders.id, { onDelete: "restrict" }),
  carrier: varchar("carrier", { length: 100 }).notNull(),
  trackingNo: varchar("tracking_no", { length: 100 }).notNull(),
  status: mysqlEnum("status", shipmentStatuses).notNull().default("PENDING"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => [
  uniqueIndex("shipments_order_id_unique").on(table.orderId),
  index("shipments_status_updated_idx").on(table.status, table.updatedAt),
]);

export const afterSales = mysqlTable("after_sales", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  orderId: int("order_id", { unsigned: true }).notNull().references(() => orders.id, { onDelete: "restrict" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "restrict" }),
  reason: varchar("reason", { length: 100 }).notNull(),
  description: varchar("description", { length: 1000 }).notNull(),
  status: mysqlEnum("status", afterSaleStatuses).notNull().default("REQUESTED"),
  refundAmountCents: bigint("refund_amount_cents", { mode: "number", unsigned: true }).notNull(),
  reviewNote: varchar("review_note", { length: 1000 }),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id, { onDelete: "restrict" }),
  reviewedAt: timestamp("reviewed_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => [
  uniqueIndex("after_sales_order_id_unique").on(table.orderId),
  index("after_sales_user_created_idx").on(table.userId, table.createdAt),
  index("after_sales_status_created_idx").on(table.status, table.createdAt),
]);

// 加到 inventoryTransactions 字段和索引数组：
idempotencyKey: varchar("idempotency_key", { length: 160 }),
uniqueIndex("inventory_transactions_idempotency_key_unique").on(table.idempotencyKey),
~~~

- [ ] **Step 4: 生成并执行迁移**

Run: `npm.cmd run db:generate`

按以下顺序审查生成 SQL：先扩展 `orders.status` 与订单 `payment_status`/`payments.status` 枚举；再给 `inventory_transactions` 增加可空幂等键和唯一索引；然后创建 `shipments`；最后创建 `after_sales` 和外键/唯一索引。迁移不得重写已应用的 `0000` 至一期迁移，不回填虚构物流、售后或幂等键。

Run: `npm.cmd run db:migrate`

Expected: 迁移在明确的本地 MySQL 测试库执行成功，现有订单、支付、SKU 与库存流水行数不变。

- [ ] **Step 5: 通过 Schema 测试并提交**

将 `shipping-after-sales.integration.test.ts` 加入 `test:db`，测试在 `finally` 中按售后、物流、支付、订单项、库存流水、订单顺序清理临时数据。

Run: `npm.cmd run test:db`

Expected: 同单重复物流/售后写入失败，合法记录通过，既有一期集成测试继续通过。

~~~bash
git add src/db/schema/commerce.ts src/db/schema/index.ts src/server/repositories/shipping-after-sales.integration.test.ts package.json drizzle
git commit -m "feat: 增加物流售后与退款模型"
~~~

### Task 2: 实现管理员发货和运输状态模拟

**Files:**
- Create: `src/features/shipping/schema.ts`
- Create: `src/server/services/shipment-service.ts`
- Create: `src/server/services/shipment-service.test.ts`
- Create: `src/server/repositories/shipment-repository.ts`
- Create: `src/server/shipments.ts`
- Modify: `src/app/actions/admin-order.ts`
- Modify: `src/features/admin/order-status-actions.tsx`
- Modify: `src/server/services/admin-order-service.ts`
- Modify: `src/server/repositories/admin-order-repository.ts`
- Modify: `src/app/admin/(protected)/orders/[orderNo]/page.tsx`

**Interfaces:**
- `ShipmentRecord = { id: number; orderId: number; carrier: string; trackingNo: string; status: ShipmentStatus; shippedAt: Date | null; deliveredAt: Date | null; updatedAt: Date }`。
- `ShipmentRepository.create(input: { orderNo: string; carrier: string; trackingNo: string; now: Date }): Promise<ShipmentCommandResult>`。
- `ShipmentRepository.advance(input: { orderNo: string; targetStatus: "IN_TRANSIT" | "DELIVERED"; now: Date }): Promise<ShipmentCommandResult>`。
- `createShipmentService(repository, { now? }).ship(admin, input)` 与 `.advance(admin, input)` 返回 `ok/code/message/shipment?` 判别联合。

- [ ] **Step 1: 写状态机和权限失败测试**

~~~ts
assert.equal((await service.ship(null, validShipInput)).code, "FORBIDDEN");
assert.equal((await service.ship(admin, { ...validShipInput, carrier: "" })).code, "INVALID_INPUT");
assert.equal((await service.advance(admin, { orderNo, targetStatus: "DELIVERED" })).code, "INVALID_STATE");
~~~

仓储集成测试覆盖：仅 `PAID/SUCCESS` 可发货；成功后同一事务插入 `shipments(SHIPPED)` 并更新 `orders(SHIPPED)`；`SHIPPED -> IN_TRANSIT -> DELIVERED` 同步更新订单状态；重复发货返回 `ALREADY_EXISTS`。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/server/services/shipment-service.test.ts`

Expected: FAIL，因为物流 schema、服务和仓储接口不存在。

- [ ] **Step 3: 实现输入与服务状态映射**

~~~ts
export const createShipmentSchema = z.object({
  orderNo: z.string().min(8).max(32).regex(/^[A-Z0-9]+$/, "订单号格式不正确"),
  carrier: z.string().trim().min(2, "请填写物流公司").max(100),
  trackingNo: z.string().trim().min(4, "请填写正确的物流单号").max(100).regex(/^[A-Za-z0-9-]+$/),
});
export const advanceShipmentSchema = z.object({
  orderNo: createShipmentSchema.shape.orderNo,
  targetStatus: z.enum(["IN_TRANSIT", "DELIVERED"]),
});

// 加到 inventoryTransactions 的索引数组：
uniqueIndex("inventory_transactions_event_variant_unique").on(
  table.type,
  table.referenceType,
  table.referenceId,
  table.variantId,
);
~~~

服务必须先判断 `AdminIdentity | null`，再 `safeParse` 输入；将 `NOT_FOUND`、`INVALID_STATE`、`ALREADY_EXISTS` 映射为“订单不存在”“当前订单状态不允许此操作”“该订单已录入物流”。

- [ ] **Step 4: 实现事务和后台表单**

`create` 事务按 `orderNo` 锁订单，验证 `PAID/SUCCESS`，插入物流后条件更新订单为 `SHIPPED`；`advance` 同时锁订单和物流，只允许 `SHIPPED -> IN_TRANSIT`、`IN_TRANSIT -> DELIVERED`，并在送达时填写 `deliveredAt`。保留后台完成入口但改为只允许 `orders.DELIVERED -> COMPLETED`，用于模拟已送达后由运营收口；用户确认收货则按 Task 3 从已发货/运输中直接完成订单。将旧 `markOrderShippedAction`/`markShipped` 替换为：

~~~ts
export async function createShipmentAction(
  _state: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState>;

export async function advanceShipmentAction(
  _state: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState>;

export async function markDeliveredOrderCompletedAction(
  _state: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState>;
~~~

后台订单详情的已支付订单显示物流公司和单号表单；已发货显示“模拟运输中”；运输中显示“模拟已送达”；已送达显示“完成订单”。每个 Action 成功后刷新后台和用户订单列表/详情。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test -- src/server/services/shipment-service.test.ts`

Run: `npm.cmd run test:db`

Expected: 非管理员、非法输入和越级状态被拒绝；合法状态转换和重复点击结果稳定。

~~~bash
git add src/features/shipping src/server/services/shipment-service.ts src/server/services/shipment-service.test.ts src/server/repositories/shipment-repository.ts src/server/shipments.ts src/app/actions/admin-order.ts src/features/admin/order-status-actions.tsx src/server/services/admin-order-service.ts src/server/repositories/admin-order-repository.ts "src/app/admin/(protected)/orders/[orderNo]/page.tsx"
git commit -m "feat: 增加订单物流履约状态"
~~~

### Task 3: 展示物流并支持用户确认收货

**Files:**
- Modify: `src/server/services/shipment-service.ts`
- Modify: `src/server/services/shipment-service.test.ts`
- Modify: `src/server/repositories/shipment-repository.ts`
- Modify: `src/server/services/order-service.ts`
- Modify: `src/server/repositories/order-repository.ts`
- Modify: `src/server/services/admin-order-service.ts`
- Modify: `src/server/repositories/admin-order-repository.ts`
- Create: `src/app/actions/shipment.ts`
- Create: `src/features/order/confirm-receipt-button.tsx`
- Modify: `src/app/orders/[orderNo]/page.tsx`
- Modify: `src/app/orders/page.tsx`
- Modify: `src/features/order/presentation.ts`

**Interfaces:**
- `OrderRecord.status` 和 `AdminOrderRecord.status` 使用完整 `typeof orderStatuses[number]`。
- 两类订单 DTO 增加 `shipment: ShipmentRecord | null`；用户 DTO 只暴露物流公司、单号、状态和时间。
- `ShipmentRepository.confirmReceipt(input: { userId: string; orderNo: string; now: Date }): Promise<ShipmentCommandResult>`。
- `shipmentService.confirmReceipt({ userId, orderNo })` 仅允许订单所有者调用。

- [ ] **Step 1: 写归属与确认收货失败测试**

~~~ts
assert.equal((await service.confirmReceipt({ userId: null, orderNo })).code, "UNAUTHORIZED");
assert.equal((await service.confirmReceipt({ userId: "other-user", orderNo })).code, "NOT_FOUND");
assert.equal((await service.confirmReceipt({ userId, orderNo: paidOrderNo })).code, "INVALID_STATE");
~~~

集成测试分别从 `SHIPPED` 和 `IN_TRANSIT` 确认收货，断言物流变为 `DELIVERED`、订单直接变为 `COMPLETED`、`deliveredAt/completedAt` 同时写入；第二次确认返回 `ALREADY_COMPLETED` 且时间戳不变。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/server/services/shipment-service.test.ts`

Expected: FAIL，因为 `confirmReceipt` 和物流 DTO 尚不存在。

- [ ] **Step 3: 实现确认收货事务和 Action**

事务以 `userId + orderNo` 锁订单并锁一对一物流。只允许 `SHIPPED` 或 `IN_TRANSIT`；条件更新物流为 `DELIVERED`，再条件更新订单为 `COMPLETED`。已完成且物流已送达映射为幂等成功。

~~~ts
export type ShipmentActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
};

export async function confirmReceiptAction(
  _state: ShipmentActionState,
  formData: FormData,
): Promise<ShipmentActionState>;
~~~

Action 使用 `getCurrentSession()` 取得用户 ID，不能从表单读取用户 ID；成功后刷新 `/orders` 和当前详情页。

- [ ] **Step 4: 附加物流快照并更新页面**

订单仓储批量读取 `shipments`，通过 `Map<orderId, ShipmentRecord>` 附加，避免列表 N+1。详情页展示物流公司、单号、状态、发货与送达时间；仅 `SHIPPED/IN_TRANSIT` 显示确认收货按钮。补齐状态标签：运输中、已送达、已退款。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test -- src/server/services/shipment-service.test.ts`

Run: `npm.cmd run test:db`

Run: `npm.cmd run typecheck`

Expected: 用户只能确认自己的订单，列表无 N+1 行为，所有订单状态标签类型完备。

~~~bash
git add src/server/services/shipment-service.ts src/server/services/shipment-service.test.ts src/server/repositories/shipment-repository.ts src/server/services/order-service.ts src/server/repositories/order-repository.ts src/server/services/admin-order-service.ts src/server/repositories/admin-order-repository.ts src/app/actions/shipment.ts src/features/order/confirm-receipt-button.tsx src/app/orders src/features/order/presentation.ts
git commit -m "feat: 支持查看物流与确认收货"
~~~

### Task 4: 实现用户订单级售后申请

**Files:**
- Create: `src/features/after-sale/schema.ts`
- Create: `src/server/services/after-sale-service.ts`
- Create: `src/server/services/after-sale-service.test.ts`
- Create: `src/server/repositories/after-sale-repository.ts`
- Create: `src/server/after-sales.ts`
- Create: `src/app/actions/after-sale.ts`
- Create: `src/features/order/after-sale-form.tsx`
- Modify: `src/server/services/order-service.ts`
- Modify: `src/server/repositories/order-repository.ts`
- Modify: `src/app/orders/[orderNo]/page.tsx`

**Interfaces:**
- `AfterSaleRecord = { id: number; orderId: number; orderNo: string; userId: string; reason: string; description: string; status: AfterSaleStatus; refundAmountCents: number; reviewNote: string | null; reviewedAt: Date | null; refundedAt: Date | null; createdAt: Date; updatedAt: Date }`。
- `AfterSaleRepository.request(input: { userId: string; orderNo: string; reason: string; description: string; now: Date }): Promise<AfterSaleCommandResult>`。
- `afterSaleService.request({ userId, orderNo, reason, description })`；退款金额不在签名中。
- `OrderRecord` 增加 `afterSale: AfterSaleRecord | null`。

- [ ] **Step 1: 写申请规则失败测试**

~~~ts
const invalid = await service.request({ userId, orderNo, reason: "", description: "x" });
assert.equal(invalid.code, "INVALID_INPUT");
const anonymous = await service.request({ userId: null, orderNo, reason: "商品破损", description: "包装破损" });
assert.equal(anonymous.code, "UNAUTHORIZED");
~~~

集成测试覆盖订单所有权、`PAID/SHIPPED/IN_TRANSIT/DELIVERED/COMPLETED` 可申请、`PENDING_PAYMENT/CANCELLED/CLOSED/REFUNDED` 不可申请、退款金额等于订单实付且不超过实付、同单重复申请只保留一条。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/server/services/after-sale-service.test.ts`

Expected: FAIL，因为售后 schema 和服务不存在。

- [ ] **Step 3: 实现白名单、服务和事务**

~~~ts
export const afterSaleRequestSchema = z.object({
  orderNo: z.string().min(8).max(32).regex(/^[A-Z0-9]+$/, "订单号格式不正确"),
  reason: z.string().trim().min(2, "请选择或填写售后原因").max(100),
  description: z.string().trim().min(5, "请补充至少 5 个字符的说明").max(1000),
});
~~~

仓储事务锁定 `userId + orderNo` 的订单，校验允许状态和 `paymentStatus === "SUCCESS"`，将服务端 `order.totalCents` 写入 `refundAmountCents`。捕获唯一键冲突后读取既有记录并返回 `ALREADY_REQUESTED`。

- [ ] **Step 4: 实现 Action 和用户页面**

~~~ts
export type AfterSaleActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function requestAfterSaleAction(
  _state: AfterSaleActionState,
  formData: FormData,
): Promise<AfterSaleActionState>;
~~~

Action 只从 Session 取 `userId`；页面在允许状态且没有售后记录时显示表单，否则显示售后编号、申请原因、退款金额、状态和审核说明。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test -- src/server/services/after-sale-service.test.ts`

Run: `npm.cmd run test:db`

Expected: 非本人、非法状态和重复申请不会新增记录；合法申请金额来自订单实付。

~~~bash
git add src/features/after-sale src/server/services/after-sale-service.ts src/server/services/after-sale-service.test.ts src/server/repositories/after-sale-repository.ts src/server/after-sales.ts src/app/actions/after-sale.ts src/features/order/after-sale-form.tsx src/server/services/order-service.ts src/server/repositories/order-repository.ts "src/app/orders/[orderNo]/page.tsx"
git commit -m "feat: 增加用户售后申请"
~~~

### Task 5: 实现管理员审核和幂等模拟退款

**Files:**
- Modify: `src/features/after-sale/schema.ts`
- Modify: `src/server/services/after-sale-service.ts`
- Modify: `src/server/services/after-sale-service.test.ts`
- Modify: `src/server/repositories/after-sale-repository.ts`
- Modify: `src/server/services/admin-order-service.ts`
- Modify: `src/server/repositories/admin-order-repository.ts`
- Modify: `src/app/actions/after-sale.ts`
- Create: `src/features/admin/after-sale-actions.tsx`
- Modify: `src/app/admin/(protected)/orders/[orderNo]/page.tsx`
- Modify: `src/app/admin/(protected)/orders/page.tsx`
- Modify: `src/server/repositories/shipping-after-sales.integration.test.ts`

**Interfaces:**
- `AfterSaleRepository.review(input: { afterSaleId: number; adminId: string; decision: "APPROVE" | "REJECT"; reviewNote: string; now: Date }): Promise<AfterSaleCommandResult>`。
- `AfterSaleRepository.refund(input: { afterSaleId: number; adminId: string; now: Date }): Promise<AfterSaleCommandResult>`。
- `afterSaleService.review(admin, input)` 与 `.refund(admin, { afterSaleId })`。
- `AdminOrderRecord` 增加 `afterSale: AfterSaleRecord | null`。

- [ ] **Step 1: 写审核、金额和幂等失败测试**

~~~ts
assert.equal((await service.review(null, approveInput)).code, "FORBIDDEN");
assert.equal((await service.refund(admin, { afterSaleId: 0 })).code, "INVALID_INPUT");
assert.equal((await service.review(admin, { ...approveInput, reviewNote: "" })).code, "INVALID_INPUT");
~~~

集成测试建立含两个 SKU 的订单，审核通过后退款，断言：`after_sales=REFUNDED`、`orders.status/paymentStatus=REFUNDED`、`payments.status=REFUNDED`；每个 SKU 恢复订单数量并各写一条 `REFUND_RESTORE`；再次退款库存和流水数量不变；退款金额篡改为大于订单实付时事务返回 `AMOUNT_MISMATCH` 并全回滚。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/server/services/after-sale-service.test.ts`

Run: `npm.cmd run test:db`

Expected: FAIL，因为审核和退款事务尚未实现。

- [ ] **Step 3: 实现审核状态机**

~~~ts
export const afterSaleReviewSchema = z.object({
  afterSaleId: z.coerce.number().int().positive(),
  decision: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().trim().min(2, "请填写审核说明").max(1000),
});
~~~

只允许 `REQUESTED -> APPROVED` 或 `REQUESTED -> REJECTED`，写入 `reviewedBy/reviewedAt/reviewNote`。已处于目标状态返回幂等成功，其他状态返回 `INVALID_STATE`。

- [ ] **Step 4: 实现模拟退款事务**

事务按售后 ID 依次锁售后、订单、支付、按 `variantId` 排序的订单项与 SKU；先按 `variantId` 聚合数量，确保每个 SKU 只产生一个退款恢复事件。验证售后为 `APPROVED`、订单处于允许退款状态、支付为 `SUCCESS`、`refundAmountCents > 0 && refundAmountCents <= order.totalCents`。事务内执行：

~~~ts
await tx.update(afterSales).set({ status: "REFUNDING", updatedAt: now })
  .where(and(eq(afterSales.id, id), eq(afterSales.status, "APPROVED")));
// 对每个订单 SKU：product_variants.stock += quantity，并插入 REFUND_RESTORE，
// referenceType = "AFTER_SALE"，referenceId = String(afterSale.id)，
// idempotencyKey = `AFTER_SALE:${afterSale.id}:VARIANT:${variantId}`。
await tx.update(payments).set({ status: "REFUNDED", updatedAt: now }).where(eq(payments.orderId, order.id));
await tx.update(orders).set({ status: "REFUNDED", paymentStatus: "REFUNDED", updatedAt: now }).where(eq(orders.id, order.id));
await tx.update(afterSales).set({ status: "REFUNDED", refundedAt: now, updatedAt: now }).where(eq(afterSales.id, id));
~~~

若首次条件更新影响 0 行，读取锁定后的最终状态；`REFUNDED` 返回 `ALREADY_REFUNDED`，不得重复恢复库存。`inventory_transactions_idempotency_key_unique` 是事务状态锁之外的第二道数据库兜底；遇到该唯一键冲突必须回滚并读取最终售后状态。不要修改会员累计实付、等级或升级流水。

- [ ] **Step 5: 接入后台页面、验证并提交**

创建 `reviewAfterSaleAction` 和 `refundAfterSaleAction`，两者内部重新取得管理员身份。后台订单列表给 `REQUESTED/APPROVED/REFUNDING` 增加售后标记；详情页展示完整售后记录，待审核显示通过/拒绝表单，已通过显示模拟退款按钮。

Run: `npm.cmd test`

Run: `npm.cmd run test:db`

Run: `npm.cmd run lint`

Run: `npm.cmd run typecheck`

Expected: 规则、权限、事务回滚、库存流水和重复退款测试通过。

~~~bash
git add src/features/after-sale src/server/services/after-sale-service.ts src/server/services/after-sale-service.test.ts src/server/repositories/after-sale-repository.ts src/server/services/admin-order-service.ts src/server/repositories/admin-order-repository.ts src/app/actions/after-sale.ts src/features/admin/after-sale-actions.tsx src/app/admin src/server/repositories/shipping-after-sales.integration.test.ts
git commit -m "feat: 增加售后审核与模拟退款"
~~~

### Task 6: 完成本期页面回归和构建验收

**Files:**
- Modify: `src/app/orders/page.tsx`
- Modify: `src/app/orders/[orderNo]/page.tsx`
- Modify: `src/app/admin/(protected)/orders/page.tsx`
- Modify: `src/app/admin/(protected)/orders/[orderNo]/page.tsx`
- Modify: `src/features/order/presentation.ts`
- Modify: `src/server/repositories/shipping-after-sales.integration.test.ts`

**Interfaces:**
- 用户订单详情完整展示订单主状态、物流快照和售后快照。
- 后台订单详情只从 `adminOrderService.getByOrderNo` 的 DTO 渲染，不直接查询表。
- 所有本期状态均由穷尽的 `Record<OrderStatus, string>`、`Record<ShipmentStatus, string>`、`Record<AfterSaleStatus, string>` 映射。

- [ ] **Step 1: 增加端到端业务序列集成测试**

测试一条订单的完整序列：支付完成 → 管理员发货 → 模拟运输中 → 用户确认收货 → 申请售后 → 审核通过 → 模拟退款；断言最终订单/支付/物流/售后状态及每个 SKU 的库存与初始值一致。

- [ ] **Step 2: 运行回归测试确认缺口**

Run: `npm.cmd run test:db`

Expected: 在页面/DTO 或完整序列尚未衔接时 FAIL；失败必须指向具体状态、库存或 DTO 断言。

- [ ] **Step 3: 补齐页面呈现与刷新路径**

确保所有成功 Action 刷新 `/orders`、`/orders/[orderNo]`、`/admin/orders`、`/admin/orders/[orderNo]`；空物流与空售后不渲染虚构内容；退款完成页面明确显示“库存已恢复，退款为本地模拟结果”。

- [ ] **Step 4: 运行全量常规验证**

Run: `npm.cmd test`

Run: `npm.cmd run test:db`

Run: `npm.cmd run lint`

Run: `npm.cmd run typecheck`

Run: `npm.cmd run build`

Expected: 五条命令全部退出码 0；构建包含用户订单页、后台订单页和既有 Route Handlers，未引入第三方物流调用。

- [ ] **Step 5: 提交本期验收收口**

~~~bash
git add src/app/orders src/app/admin src/features/order/presentation.ts src/server/repositories/shipping-after-sales.integration.test.ts
git commit -m "test: 验收物流售后完整流程"
~~~

## 完成标准

- 仅已支付订单能发货，一单一物流；运输状态不可跳级或倒退。
- 用户可查看自己订单的物流快照，并只能确认自己的已发货/运输中订单。
- 用户只能对自己的可售后订单申请一次订单级售后，退款金额完全由服务端订单实付计算。
- 管理员可审核申请；模拟退款原子更新售后、订单和支付，并按订单项 SKU 恢复库存、写 `REFUND_RESTORE`。
- 重复发货、确认收货、申请和退款均不会产生重复物流、售后、库存或支付结果。
- `npm test`、`npm run test:db`、`npm run lint`、`npm run typecheck`、`npm run build` 全部通过后方可进入第三期。
