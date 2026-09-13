# 用户、安全与运营实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在二期物流与售后基础上交付用户/会员后台、冻结控制、密码修改与重置、登录限流、管理员审计、订单备注/筛选/CSV 导出和运营看板。

**Architecture:** 继续使用 Better Auth 处理密码哈希、Session 和重置令牌，应用服务只编排冻结状态、限流和统一文案。用户、审计、订单运营和看板分别由聚焦的 service/repository 管理；Server Component 读取 DTO，Server Action 写业务数据，CSV 使用只读 Route Handler 返回当前筛选结果。

**Tech Stack:** Next.js 16.3.5 App Router、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、MySQL 8.4、Drizzle ORM 0.45.2、Better Auth 1.7.4、Zod 4.6.2、Node.js 24、npm。

**Spec:** `docs/superpowers/specs/2026-09-14-operations-upgrade-design.md`（第 3.6 至 3.9、5、6、7、8 节）

## Global Constraints

- 本期以一期 `product_variants`/`inventory_transactions` 和二期 `shipments`/`after_sales`/退款状态为已完成前置，不修改它们已验收的状态机语义。
- 页面默认使用 Server Component；表单写入使用 Server Action；Better Auth 回调和 CSV 下载使用 Route Handler。
- 所有管理员页面与 Action 在服务端重新校验 `AdminIdentity`；隐藏按钮不构成权限控制。
- 冻结只适用于 `USER`；管理员不能冻结自己，不能通过用户表单修改角色、累计实付或会员等级。
- 冻结用户仍可登录并读取自己的历史订单、物流和售后，但不能新增购物车商品、提交订单、支付或申请售后。
- 修改密码和重置密码继续委托 Better Auth，不直接读写 `accounts.password`；新密码长度为 8 至 128 位。
- 登录错误和忘记密码响应使用统一文案，不透露邮箱是否存在；重置令牌只写服务端开发日志，不在页面、Action 返回值或生产日志中出现。
- 登录与重置请求同时执行 IP 维度和规范化账号维度限流；账号限流键只保存邮箱 SHA-256 摘要，不保存明文邮箱。
- 管理员写操作成功后写 `audit_logs`；摘要不得包含密码、重置令牌、Cookie、Session token 或支付密钥。
- 金额使用整数分；今日边界统一按 `Asia/Shanghai` 计算；客户端时间范围和金额均不可信。
- CSV 仅包含计划声明的运营字段，UTF-8 BOM，RFC 4180 引号转义；不得导出认证、Session、令牌或密码字段。
- 不新增运行时依赖；仅保留功能、权限边界和限流行为测试，以及 `npm test`、`npm run test:db`、`npm run lint`、`npm run typecheck`、`npm run build` 常规验证。

## 文件结构与职责

- Modify: `src/db/schema/auth.ts` — 用户状态和 Better Auth 持久限流表。
- Modify: `src/db/schema/commerce.ts` — 订单管理员备注与审计日志。
- Modify: `src/lib/auth.ts` — Better Auth 密码重置、IP 限流和账号限流钩子。
- Modify: `src/lib/auth-client.ts` — 沿用 Better Auth 客户端类型出口。
- Create: `src/lib/timezone.ts` — 上海时区当天边界。
- Create: `src/lib/csv.ts` — CSV 单元格与文档编码。
- Create: `src/server/services/admin-user-service.ts`、`src/server/repositories/admin-user-repository.ts`、`src/server/admin-users.ts` — 用户/会员后台。
- Create: `src/server/services/auth-rate-limit-service.ts`、`src/server/repositories/auth-rate-limit-repository.ts` — 账号维度原子限流。
- Create: `src/server/services/audit-service.ts`、`src/server/repositories/audit-repository.ts`、`src/server/audit.ts` — 管理员审计 DTO 和记录。
- Create: `src/server/services/admin-dashboard-service.ts`、`src/server/repositories/admin-dashboard-repository.ts`、`src/server/admin-dashboard.ts` — 运营统计。
- Modify: `src/server/auth/session.ts` — 区分只读 Session 与 ACTIVE 写操作身份。
- Modify: `src/app/actions/cart.ts`、`src/app/actions/order.ts`、`src/app/actions/payment.ts`、`src/app/actions/after-sale.ts` — 冻结用户写入拦截。
- Create: `src/features/admin/user-schema.ts`、`user-status-actions.tsx` — 用户查询与冻结表单。
- Create: `src/app/actions/admin-user.ts` — 冻结/解冻 Action。
- Create: `src/app/admin/(protected)/users/page.tsx`、`[id]/page.tsx` — 用户列表与详情。
- Create: `src/features/auth/change-password-form.tsx`、`forgot-password-form.tsx`、`reset-password-form.tsx` — 账号安全交互。
- Create: `src/app/account/password/page.tsx`、`forgot-password/page.tsx`、`reset-password/page.tsx` — 账号安全页面。
- Modify: `src/features/admin/order-schema.ts`、`src/server/services/admin-order-service.ts`、`src/server/repositories/admin-order-repository.ts`、`src/app/actions/admin-order.ts`、`src/app/admin/(protected)/orders/page.tsx`、`src/app/admin/(protected)/orders/[orderNo]/page.tsx` — 备注、日期筛选和售后筛选。
- Create: `src/app/api/admin/orders/export/route.ts` — 管理员 CSV 导出。
- Modify: `src/app/admin/(protected)/page.tsx` — 运营看板。
- Create: `src/server/services/admin-user-service.test.ts`、`src/server/services/order-service.test.ts`、`src/server/services/auth-rate-limit-service.test.ts`、`src/server/services/audit-service.test.ts`、`src/server/services/admin-order-service.test.ts`、`src/server/services/admin-dashboard-service.test.ts`、`src/lib/csv.test.ts`、`src/lib/timezone.test.ts`、`src/server/repositories/users-security-operations.integration.test.ts`；Modify: `src/features/auth/schema.test.ts`、`src/server/services/cart-service.test.ts`、`src/server/services/payment-service.test.ts`、`src/server/services/after-sale-service.test.ts`、`package.json`。
- Create: the next Drizzle Kit SQL file in `drizzle/`（第二期完成后序号应为 `0005`，保留工具生成的完整文件名）。

---

### Task 1: 增加用户状态、限流、备注和审计 Schema

**Files:**
- Modify: `src/db/schema/auth.ts`
- Modify: `src/db/schema/commerce.ts`
- Modify: `src/db/schema/index.ts`
- Create: `src/server/repositories/users-security-operations.integration.test.ts`
- Modify: `package.json`
- Create: the Drizzle Kit generated `0005` SQL file under `drizzle/`

**Interfaces:**
- `userStatuses = ["ACTIVE", "FROZEN"] as const`；`users.status` 默认为 `ACTIVE`。
- `rateLimits = { key: string; count: number; lastRequest: number }`，同时供 Better Auth `rateLimit` 模型与账号限流服务使用。
- `orders.adminNote: string | null`，最大业务长度 1000。
- `auditLogs` 字段为 `operatorUserId/action/targetType/targetId/summary/createdAt`。

- [ ] **Step 1: 写 Schema 失败测试**

~~~ts
await db.update(schema.users).set({ status: "FROZEN" }).where(eq(schema.users.id, userId));
await db.insert(schema.rateLimits).values({ key: `account:login:${suffix}`, count: 1, lastRequest: Date.now() });
await db.insert(schema.auditLogs).values({
  operatorUserId: adminId,
  action: "USER_FREEZE",
  targetType: "USER",
  targetId: userId,
  summary: "冻结普通用户",
});
~~~

断言 `orders.adminNote` 可写入且用户默认状态为 `ACTIVE`。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/users-security-operations.integration.test.ts`

Expected: FAIL，因为新增表和字段尚不存在。

- [ ] **Step 3: 定义 Schema**

~~~ts
export const rateLimits = mysqlTable("rate_limits", {
  key: varchar("key", { length: 255 }).primaryKey(),
  count: int("count", { unsigned: true }).notNull(),
  lastRequest: bigint("last_request", { mode: "number", unsigned: true }).notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  operatorUserId: varchar("operator_user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 100 }).notNull(),
  targetId: varchar("target_id", { length: 100 }).notNull(),
  summary: varchar("summary", { length: 1000 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("audit_logs_operator_created_idx").on(table.operatorUserId, table.createdAt),
  index("audit_logs_target_created_idx").on(table.targetType, table.targetId, table.createdAt),
]);
~~~

在 `users` 增加状态索引，在 `orders` 增加 `adminNote`；不更改二期订单、支付、物流和售后枚举。

- [ ] **Step 4: 生成、审查并执行迁移**

Run: `npm.cmd run db:generate`

迁移顺序：先为 `users.status` 添加带默认值的非空列并回填 `ACTIVE`；再添加 `orders.admin_note`；然后创建 `rate_limits`；最后创建 `audit_logs` 及索引。不得在迁移中冻结现有用户或产生虚构审计记录。

Run: `npm.cmd run db:migrate`

Expected: 现有用户全部为 `ACTIVE`，二期订单/物流/售后记录和库存不变。

- [ ] **Step 5: 通过测试并提交**

将新集成测试加入 `test:db`，清理时只删除测试前缀的限流和审计记录并恢复测试用户状态/订单备注。

Run: `npm.cmd run test:db`

~~~bash
git add src/db/schema/auth.ts src/db/schema/commerce.ts src/db/schema/index.ts src/server/repositories/users-security-operations.integration.test.ts package.json drizzle
git commit -m "feat: 增加用户状态与运营审计模型"
~~~

### Task 2: 实现用户与会员后台及冻结/解冻

**Files:**
- Create: `src/features/admin/user-schema.ts`
- Create: `src/server/services/admin-user-service.ts`
- Create: `src/server/services/admin-user-service.test.ts`
- Create: `src/server/repositories/admin-user-repository.ts`
- Create: `src/server/admin-users.ts`
- Create: `src/app/actions/admin-user.ts`
- Create: `src/features/admin/user-status-actions.tsx`
- Create: `src/app/admin/(protected)/users/page.tsx`
- Create: `src/app/admin/(protected)/users/[id]/page.tsx`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- `AdminUserQuery = { search?: string; role?: "USER" | "ADMIN"; status?: "ACTIVE" | "FROZEN"; page: number }`。
- `AdminUserSummary = { id: string; name: string; email: string; role: UserRole; status: UserStatus; membershipLevel: MembershipLevel; lifetimePaidCents: number; membershipUpgradedAt: Date | null; orderCount: number; lastOrderAt: Date | null; createdAt: Date }`。
- `AdminUserDetail = AdminUserSummary & { membershipLogs: MembershipLogDto[]; recentOrders: AdminUserOrderSummary[] }`。
- `AdminUserRepository.setStatus(input: { adminId: string; targetUserId: string; status: UserStatus; now: Date }): Promise<UserStatusResult>`。
- `adminUserService.list/get/setStatus(admin, input)`。

- [ ] **Step 1: 写查询和权限失败测试**

~~~ts
assert.equal((await service.list(null, { page: 1 })).code, "FORBIDDEN");
assert.equal((await service.setStatus(admin, { targetUserId: admin.id, status: "FROZEN" })).code, "SELF_FORBIDDEN");
assert.equal((await service.setStatus(admin, { targetUserId: otherAdminId, status: "FROZEN" })).code, "ROLE_FORBIDDEN");
~~~

测试列表按邮箱/姓名搜索及角色/状态筛选；详情返回累计实付、会员等级、升级流水和最近 10 笔订单摘要；不存在返回 `NOT_FOUND`。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/server/services/admin-user-service.test.ts`

Expected: FAIL，因为用户后台服务尚未创建。

- [ ] **Step 3: 实现 schema、服务和仓储**

~~~ts
export const adminUserQuerySchema = z.object({
  search: z.string().trim().max(100).optional().catch(undefined),
  role: z.enum(["USER", "ADMIN"]).optional().catch(undefined),
  status: z.enum(["ACTIVE", "FROZEN"]).optional().catch(undefined),
  page: z.coerce.number().int().positive().catch(1),
});
export const adminUserStatusSchema = z.object({
  targetUserId: z.string().uuid("用户参数不正确"),
  status: z.enum(["ACTIVE", "FROZEN"]),
});
~~~

`setStatus` 事务锁定目标用户，仅 `role=USER` 可修改。冻结不删除 Session，也不阻止后续登录，以保证用户仍能查看历史订单；受限写操作由 Task 3 的状态检查拦截。仓储不提供更新 `role`、`membershipLevel` 或 `lifetimePaidCents` 的方法。

- [ ] **Step 4: 实现 Action 和后台页面**

`setAdminUserStatusAction` 重新取得管理员身份，成功后刷新用户列表和详情。列表页提供搜索、角色和状态筛选；详情页展示会员信息、升级流水、最近订单并提供冻结/解冻按钮。后台导航增加“用户与会员”。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test -- src/server/services/admin-user-service.test.ts`

Run: `npm.cmd run test:db`

Expected: 普通用户/匿名访问被拒，不能冻结自己或其他管理员，冻结不删除 Session，会员字段保持不变。

~~~bash
git add src/features/admin/user-schema.ts src/server/services/admin-user-service.ts src/server/services/admin-user-service.test.ts src/server/repositories/admin-user-repository.ts src/server/admin-users.ts src/app/actions/admin-user.ts src/features/admin/user-status-actions.tsx "src/app/admin/(protected)/users" src/app/admin/layout.tsx
git commit -m "feat: 增加用户会员后台与冻结控制"
~~~

### Task 3: 在所有交易写入口执行冻结状态检查

**Files:**
- Modify: `src/server/auth/session.ts`
- Modify: `src/app/actions/cart.ts`
- Modify: `src/app/actions/order.ts`
- Modify: `src/app/actions/payment.ts`
- Modify: `src/app/actions/after-sale.ts`
- Modify: `src/server/services/cart-service.ts`
- Modify: `src/server/services/order-service.ts`
- Modify: `src/server/services/payment-service.ts`
- Modify: `src/server/services/after-sale-service.ts`
- Modify: `src/server/services/cart-service.test.ts`
- Create: `src/server/services/order-service.test.ts`
- Modify: `src/server/services/payment-service.test.ts`
- Modify: `src/server/services/after-sale-service.test.ts`

**Interfaces:**
- `getCurrentSession()` 保留历史订单等只读用途。
- `getActiveUserIdentity(): Promise<{ id: string; status: "ACTIVE" } | null>` 只返回存在、未冻结的 Session 用户。
- `cartService.addItem`、`orderService.createOrder`、`paymentService.pay` 和 `afterSaleService.request` 接受 `userStatus?: UserStatus` 或由 Action 在无 ACTIVE 身份时统一返回 `ACCOUNT_FROZEN`；浏览器永远不能提交状态字段。

- [ ] **Step 1: 写冻结用户行为失败测试**

对新增购物车商品、提交订单、支付、申请售后逐项断言 `FROZEN -> ACCOUNT_FROZEN`，同时断言登录、更新/删除既有购物车项、取消/确认既有订单和 `listOrders/getOrder` 对冻结用户仍按原状态规则执行。示例：

~~~ts
const result = await paymentService.pay({ userId, userStatus: "FROZEN", orderNo });
assert.deepEqual(result, { ok: false, code: "ACCOUNT_FROZEN", message: "账号已被冻结，暂时无法执行此操作" });
~~~

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test`

Expected: FAIL，当前写入口只验证 Session，不读取 `users.status`。

- [ ] **Step 3: 实现 ACTIVE 身份读取和服务二次校验**

`getActiveUserIdentity` 先调用 Better Auth Session，再按 `users.id + status=ACTIVE` 查询。Action 无 Session 返回原未登录提示；有 Session 但无 ACTIVE 身份返回统一冻结提示。服务层仍对 `userStatus` 二次校验，避免其他调用方绕过 Action。

- [ ] **Step 4: 替换所有既有和二期写入口**

`addToCartAction`、创建订单、模拟支付和申请售后使用 ACTIVE 身份；更新/删除既有购物车项、取消订单、确认收货以及订单列表/详情继续使用 `getCurrentSession`。管理员对冻结用户既有订单的物流/售后处理不受影响。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test`

Run: `npm.cmd run test:db`

Run: `npm.cmd run typecheck`

Expected: ACTIVE 用户回归通过，FROZEN 用户的四类受限写入被拒，既有购物车清理和历史订单履约/读取仍可用。

~~~bash
git add src/server/auth/session.ts src/app/actions/cart.ts src/app/actions/order.ts src/app/actions/payment.ts src/app/actions/after-sale.ts src/server/services src/server/services/*.test.ts
git commit -m "feat: 限制冻结用户交易写操作"
~~~

### Task 4: 接入修改密码和忘记密码流程

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/features/auth/schema.ts`
- Modify: `src/features/auth/schema.test.ts`
- Create: `src/features/auth/change-password-form.tsx`
- Create: `src/features/auth/forgot-password-form.tsx`
- Create: `src/features/auth/reset-password-form.tsx`
- Create: `src/app/account/password/page.tsx`
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/reset-password/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/features/auth/user-navigation.tsx`

**Interfaces:**
- `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`。
- `authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })`。
- `authClient.resetPassword({ newPassword, token })`。
- `changePasswordSchema`、`forgotPasswordSchema`、`resetPasswordSchema` 统一 8–128 位规则并校验确认密码。

- [ ] **Step 1: 写表单 schema 失败测试**

~~~ts
assert.equal(changePasswordSchema.safeParse({ currentPassword: "old", newPassword: "short", confirmPassword: "short" }).success, false);
assert.equal(resetPasswordSchema.safeParse({ token: "token", newPassword: "new-pass-123", confirmPassword: "different" }).success, false);
assert.equal(forgotPasswordSchema.parse({ email: " USER@EXAMPLE.COM " }).email, "user@example.com");
~~~

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/features/auth/schema.test.ts`

Expected: FAIL，因为三个 schema 尚不存在。

- [ ] **Step 3: 配置 Better Auth 密码重置**

在 `emailAndPassword` 保留 `minPasswordLength: 8`、`maxPasswordLength: 128`，新增 `resetPasswordTokenExpiresIn: 3600` 和：

~~~ts
sendResetPassword: async ({ user, url, token }) => {
  if (process.env.NODE_ENV === "development") {
    console.info("本地密码重置链接", { userId: user.id, url, token });
  }
},
~~~

生产环境不输出链接或令牌；公开请求无论邮箱是否存在都显示“如果该邮箱已注册，重置邮件已发送”。

- [ ] **Step 4: 实现三个页面和表单**

修改密码页先由 Server Component 检查 Session；客户端调用 `changePassword` 并要求当前密码。重置页从 Promise `searchParams` 读取 token，不将 token写入日志或错误文案；成功后跳转登录。登录页增加“忘记密码”，已登录导航增加“修改密码”。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test -- src/features/auth/schema.test.ts`

Run: `npm.cmd run lint`

Run: `npm.cmd run typecheck`

Expected: 密码长度/确认字段、当前密码错误和统一忘记密码响应均按约定工作；实现未直接读写密码哈希。

~~~bash
git add src/lib/auth.ts src/features/auth src/app/account/password src/app/forgot-password src/app/reset-password src/app/login/page.tsx
git commit -m "feat: 增加密码修改与重置流程"
~~~

### Task 5: 增加 IP 与账号双维度认证限流

**Files:**
- Create: `src/server/services/auth-rate-limit-service.ts`
- Create: `src/server/services/auth-rate-limit-service.test.ts`
- Create: `src/server/repositories/auth-rate-limit-repository.ts`
- Create: `src/server/auth-rate-limit.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/app/api/auth/[...all]/route.ts`

**Interfaces:**
- Better Auth IP 规则：登录 `window=60` 秒、`max=5`；请求密码重置 `window=900` 秒、`max=3`，`storage="database"`。
- `AuthRateLimitRepository.consume(input: { key: string; windowSeconds: number; max: number; nowMs: number }): Promise<{ allowed: boolean; retryAfter: number }>` 原子检查并计数。
- `authRateLimitService.consumeAccount({ scope: "LOGIN" | "PASSWORD_RESET"; email: string; now?: Date })`，键格式 `account:<scope>:<sha256(normalizedEmail)>`。

- [ ] **Step 1: 写限流行为失败测试**

~~~ts
for (let index = 0; index < 5; index += 1) {
  assert.equal((await service.consumeAccount({ scope: "LOGIN", email: "USER@example.com" })).allowed, true);
}
assert.equal((await service.consumeAccount({ scope: "LOGIN", email: "user@example.com" })).allowed, false);
~~~

测试账号规范化、窗口到期重置、登录和重置不同配额、并发请求最多只放行配额数量；不测试密码猜测内容。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/server/services/auth-rate-limit-service.test.ts`

Expected: FAIL，因为限流服务和持久仓储不存在。

- [ ] **Step 3: 实现账号原子限流**

仓储事务按 key 读取并 `FOR UPDATE`；无记录插入 count=1；窗口过期重置；窗口内使用 `count < max` 条件更新。唯一键冲突重试一次后读取最终结果。服务使用 `createHash("sha256")`，不持久化明文邮箱。

- [ ] **Step 4: 配置 Better Auth IP 限流和账号钩子**

在 drizzleAdapter schema 增加 `rateLimit: rateLimits`，配置：

~~~ts
rateLimit: {
  enabled: true,
  storage: "database",
  customRules: {
    "/sign-in/email": { window: 60, max: 5 },
    "/request-password-reset": { window: 900, max: 3 },
  },
},
~~~

在 Better Auth `hooks.before` 对 `/sign-in/email` 和 `/request-password-reset` 读取已由 Better Auth 解析的 `ctx.body.email`，调用账号限流；拒绝时抛出 429 且中文统一文案“请求过于频繁，请稍后再试”。冻结用户仍允许登录以读取已有订单，登录钩子不得以用户状态拒绝凭证。Catch-all Route Handler 保持 `toNextJsHandler(auth)`，不自行处理密码或 Cookie。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test -- src/server/services/auth-rate-limit-service.test.ts`

Run: `npm.cmd run test:db`

Run: `npm.cmd run typecheck`

Expected: IP 和账号规则均启用；大小写不同的同一邮箱共享配额；冻结账号仍可创建 Session 读取历史数据；现有认证 Route Handler 仍由 Better Auth 响应。

~~~bash
git add src/server/services/auth-rate-limit-service.ts src/server/services/auth-rate-limit-service.test.ts src/server/repositories/auth-rate-limit-repository.ts src/server/auth-rate-limit.ts src/lib/auth.ts "src/app/api/auth/[...all]/route.ts"
git commit -m "feat: 增加认证双维度限流"
~~~

### Task 6: 记录所有管理员写操作审计

**Files:**
- Create: `src/server/services/audit-service.ts`
- Create: `src/server/services/audit-service.test.ts`
- Create: `src/server/repositories/audit-repository.ts`
- Create: `src/server/audit.ts`
- Modify: `src/app/actions/admin-category.ts`
- Modify: `src/app/actions/admin-product.ts`
- Modify: `src/app/actions/admin-order.ts`
- Modify: `src/app/actions/admin-user.ts`
- Modify: `src/app/actions/after-sale.ts`
- Modify: `src/app/api/admin/product-images/route.ts`
- Modify: `src/app/api/admin/product-images/[id]/route.ts`
- Modify: `src/server/repositories/admin-category-repository.ts`
- Modify: `src/server/repositories/admin-product-repository.ts`
- Modify: `src/server/repositories/inventory-repository.ts`
- Create: `src/server/repositories/product-image-repository.ts`
- Modify: `src/server/repositories/shipment-repository.ts`
- Modify: `src/server/repositories/after-sale-repository.ts`
- Modify: `src/server/repositories/admin-user-repository.ts`
- Modify: `src/server/repositories/admin-order-repository.ts`
- Create: `src/app/admin/(protected)/audit-logs/page.tsx`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- `AuditInput = { operatorUserId: string; action: AuditAction; targetType: "CATEGORY" | "PRODUCT" | "VARIANT" | "INVENTORY" | "PRODUCT_IMAGE" | "ORDER" | "SHIPMENT" | "AFTER_SALE" | "USER"; targetId: string; summary: string }`。
- `auditService.makeWriteInput(admin, inputWithoutOperator): { ok: true; audit: AuditInput } | { ok: false; code: "FORBIDDEN" | "INVALID_INPUT" }`；业务服务把返回的 `audit` 交给 mutating repository。
- `AuditTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]`；`AuditRepository.insert(tx: AuditTransaction, input: AuditInput): Promise<void>` 只在调用方业务事务内执行。
- `auditService.list(admin, { operatorUserId?, targetType?, page }): Promise<AuditLogPageResult>`。

- [ ] **Step 1: 写审计覆盖失败测试**

服务测试拒绝空 action/targetId、超过 1000 字摘要和非管理员。仓储集成测试逐项断言成功写操作与审计记录一起提交，业务条件失败或强制审计插入失败时二者一起回滚；覆盖分类创建/更新/状态、商品创建/更新/归档、SKU 更新、库存调整、图片上传/删除/排序、订单物流、售后审核/退款、用户冻结/解冻和订单备注。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/server/services/audit-service.test.ts`

Expected: FAIL，因为审计服务和既有 Action 接线尚不存在。

- [ ] **Step 3: 实现审计服务和安全摘要**

定义有限 `AuditAction` 联合，例如 `PRODUCT_CREATE`、`SHIPMENT_ADVANCE`、`AFTER_SALE_REFUND`、`USER_FREEZE`。摘要仅由服务端模板和已验证的名称/编号组成；服务拒绝包含 `password`、`token`、`cookie`、`secret`（大小写不敏感）的键值式摘要。

- [ ] **Step 4: 接入所有管理员 Action 和只读页面**

将 `AuditWriteInput` 传入每个 mutating repository 方法，由仓储在业务数据相同的 MySQL 事务中插入 `audit_logs`；操作者只来自当前 `admin.id`。分类、商品/SKU、库存、订单物流、售后退款、用户状态和订单备注统一采用此模式。图片上传先保存文件，再在同一数据库事务中写图片记录和审计；事务失败时调用一期存储适配器删除刚保存的文件。后台只读列表按时间倒序，可按操作者和目标类型筛选。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test`

Run: `npm.cmd run test:db`

Expected: 所有现存管理员写入口均有明确 action/target，普通用户不能写或读审计日志，摘要不含敏感值。

~~~bash
git add src/server/services/audit-service.ts src/server/services/audit-service.test.ts src/server/repositories/audit-repository.ts src/server/audit.ts src/app/actions src/app/api/admin src/app/admin src/features/admin
git commit -m "feat: 增加后台操作审计"
~~~

### Task 7: 增加订单备注、组合筛选与 CSV 导出

**Files:**
- Modify: `src/features/admin/order-schema.ts`
- Create: `src/lib/csv.ts`
- Create: `src/lib/csv.test.ts`
- Create: `src/lib/timezone.ts`
- Create: `src/lib/timezone.test.ts`
- Modify: `src/server/services/admin-order-service.ts`
- Create: `src/server/services/admin-order-service.test.ts`
- Modify: `src/server/repositories/admin-order-repository.ts`
- Modify: `src/app/actions/admin-order.ts`
- Modify: `src/app/admin/(protected)/orders/page.tsx`
- Modify: `src/app/admin/(protected)/orders/[orderNo]/page.tsx`
- Create: `src/app/api/admin/orders/export/route.ts`

**Interfaces:**
- `AdminOrderQuery = { search?: string; status?: OrderStatus; afterSaleStatus?: AfterSaleStatus; dateFrom?: string; dateTo?: string; page: number }`。
- `AdminOrderRepository.list(input: AdminOrderFilter & { page: number; pageSize: number })` 和 `.listForExport(input: AdminOrderFilter): Promise<AdminOrderExportRow[]>` 复用同一条件构造器。
- `adminOrderService.updateNote(admin, { orderNo, note })`；note 为空字符串时保存 `null`。
- `encodeCsv(headers: string[], rows: Array<Array<string | number | null>>): string`。

- [ ] **Step 1: 写筛选、备注和 CSV 失败测试**

~~~ts
assert.equal(adminOrderNoteSchema.safeParse({ orderNo, note: "x".repeat(1001) }).success, false);
assert.equal(encodeCsv(["订单号"], [["=1+1"]]), "\uFEFF订单号\r\n\"'=1+1\"\r\n");
~~~

测试订单号/用户邮箱/状态/售后状态/起止日期组合条件，`dateFrom > dateTo` 返回中文错误；CSV 列集合严格等于声明字段且不含 password、session、token、providerTradeNo。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/lib/csv.test.ts src/lib/timezone.test.ts src/server/services/admin-order-service.test.ts`

Expected: FAIL，因为备注接口、日期工具和 CSV 编码器不存在。

- [ ] **Step 3: 实现统一筛选与备注**

`buildAdminOrderWhere(filter)` 对订单号/邮箱使用参数化 `like`，状态用 `eq`，日期使用服务端解析后的 `[start,endExclusive)`。备注 Action 重新鉴权，成功后记录 `ORDER_NOTE_UPDATE` 审计并刷新列表/详情。

- [ ] **Step 4: 实现 CSV Route Handler**

Route Handler 先 `getAdminSession`，再解析与页面相同的 query schema，调用 `listForExport`，返回固定列：订单号、用户邮箱、订单状态、支付状态、售后状态、实付金额（分）、收件人、物流公司、物流单号、管理员备注、创建时间。响应头：

~~~ts
return new Response(csv, {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="orders-${date}.csv"`,
    "Cache-Control": "no-store",
  },
});
~~~

CSV 单元格对逗号、引号和换行按 RFC 4180 转义，对以 `= + - @` 开头的文本前置单引号。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd test -- src/lib/csv.test.ts src/lib/timezone.test.ts src/server/services/admin-order-service.test.ts`

Run: `npm.cmd run typecheck`

Run: `npm.cmd run lint`

Expected: 页面和导出使用相同筛选条件，非管理员得到 403，备注和导出字段满足约束。

~~~bash
git add src/features/admin/order-schema.ts src/lib/csv.ts src/lib/csv.test.ts src/lib/timezone.ts src/lib/timezone.test.ts src/server/services/admin-order-service.ts src/server/services/admin-order-service.test.ts src/server/repositories/admin-order-repository.ts src/app/actions/admin-order.ts src/app/admin "src/app/api/admin/orders/export/route.ts"
git commit -m "feat: 增加订单运营筛选与导出"
~~~

### Task 8: 实现运营看板并完成第三期验收

**Files:**
- Create: `src/server/services/admin-dashboard-service.ts`
- Create: `src/server/services/admin-dashboard-service.test.ts`
- Create: `src/server/repositories/admin-dashboard-repository.ts`
- Create: `src/server/admin-dashboard.ts`
- Modify: `src/app/admin/(protected)/page.tsx`
- Modify: `src/server/admin/auth.ts`
- Modify: `src/server/repositories/users-security-operations.integration.test.ts`

**Interfaces:**
- `getShanghaiDayRange(now: Date): { start: Date; endExclusive: Date }`。
- `AdminDashboardMetrics = { todayOrderCount: number; todaySalesCents: number; pendingPaymentCount: number; pendingShipmentCount: number; activeAfterSaleCount: number; lowStockVariantCount: number; recentOrders: AdminDashboardOrder[] }`。
- `adminDashboardService.get(admin, now?): Promise<{ ok: true; data: AdminDashboardMetrics } | { ok: false; code: "FORBIDDEN" }>`。

- [ ] **Step 1: 写统计口径失败测试**

固定当前时间为 `2026-09-14T04:00:00.000Z`，断言上海当天范围为 `2026-09-13T16:00:00.000Z` 至 `2026-09-14T16:00:00.000Z`。仓储假数据断言：今日订单按 `createdAt`；今日销售额只合计当天 `paidAt` 且支付仍为 `SUCCESS` 的订单；待发货为 `PAID`；售后处理中为 `REQUESTED/APPROVED/REFUNDING`；低库存为 ACTIVE SKU `stock <= LOW_STOCK_THRESHOLD`；最近订单最多 10 条。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm.cmd test -- src/server/services/admin-dashboard-service.test.ts src/lib/timezone.test.ts`

Expected: FAIL，因为看板服务尚不存在，旧 `getAdminDashboardCounts` 只有总量统计。

- [ ] **Step 3: 实现聚合仓储和服务**

使用并行 Drizzle 聚合查询，不加载全表后在 Node.js 汇总。销售额排除 `REFUNDED` 支付；低库存复用一期 `LOW_STOCK_THRESHOLD = 10`；最近订单 DTO 只返回订单号、用户邮箱、状态、实付和创建时间。服务先检查管理员身份。

- [ ] **Step 4: 替换后台概览页面**

移除 `getAdminDashboardCounts` 的页面职责，改由 `adminDashboardService.get`。卡片展示今日订单、今日销售额、待支付、待发货、售后处理中和低库存 SKU；下方显示最近 10 笔订单并链接详情。所有金额用 `formatCny`，所有时间按项目时区展示。

- [ ] **Step 5: 运行第三期全量验证并提交**

Run: `npm.cmd test`

Run: `npm.cmd run test:db`

Run: `npm.cmd run lint`

Run: `npm.cmd run typecheck`

Run: `npm.cmd run build`

Expected: 五条命令退出码均为 0；生产构建包含用户后台、审计页、账号安全页、订单导出 Route Handler 和运营看板；二期物流/售后/退款回归通过。

~~~bash
git add src/server/services/admin-dashboard-service.ts src/server/services/admin-dashboard-service.test.ts src/server/repositories/admin-dashboard-repository.ts src/server/admin-dashboard.ts "src/app/admin/(protected)/page.tsx" src/server/admin/auth.ts src/server/repositories/users-security-operations.integration.test.ts
git commit -m "feat: 完成商城运营看板"
~~~

## 完成标准

- 后台可搜索/筛选用户，查看会员与订单摘要，只能冻结/解冻普通用户且不能冻结自己。
- 冻结用户仍可登录、清理既有购物车和处理既有订单，但不能新增购物车商品、提交订单、支付或申请售后。
- 修改密码校验当前密码；忘记密码使用一小时 Better Auth 一次性令牌，公开响应不泄露账号存在性。
- 登录和密码重置同时受持久 IP 与账号摘要配额限制。
- 分类、商品/SKU、库存、图片、订单物流、售后退款、用户状态和订单备注的成功后台写入均产生审计日志。
- 订单页面支持组合筛选、备注和同条件 CSV 导出，导出不包含认证或支付敏感字段。
- 看板按 `Asia/Shanghai` 展示今日订单/销售额、待支付、待发货、售后处理中、低库存 SKU 和最近订单。
- `npm test`、`npm run test:db`、`npm run lint`、`npm run typecheck`、`npm run build` 全部通过。
