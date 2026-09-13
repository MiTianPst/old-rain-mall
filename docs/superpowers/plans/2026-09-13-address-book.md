# Address Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为登录用户提供最多 20 条收货地址的新增、编辑、删除、默认地址管理，并让结算模块通过稳定服务接口读取地址。

**Architecture:** 新建独立地址 Schema、纯业务服务和 Drizzle 仓储，Server Action 只负责 Session、Zod 输入和页面刷新。地址所有权、数量上限和默认地址切换全部在服务端与数据库事务内保证。

**Tech Stack:** Next.js 16.3.5 App Router、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、Drizzle ORM 0.45.2、MySQL 8.4、Zod 4.6.2、Node test runner

**Spec:** `docs/superpowers/specs/2026-09-13-address-checkout-orders-payments-design.md`

## Global Constraints

- UI 文案和必要注释使用中文。
- Server Component 直接调用服务层；写操作使用 Server Action。
- 每个 Server Action 内重新获取 Session，不接受客户端 `userId`。
- 所有地址输入用 Zod 校验；用户只能操作自己的地址。
- 每个用户最多 20 条地址，第一条自动默认，同一用户最多一个默认地址。
- 数据库变更必须由 `npm run db:generate` 生成迁移并用 `npm run db:migrate` 执行。

---

### Task 1: 地址表结构与迁移

**Files:**
- Create: `src/db/schema/address.ts`
- Modify: `src/db/schema/index.ts`
- Create: `drizzle/0001_*.sql`（由 Drizzle Kit 生成，使用实际生成文件名）
- Modify: `drizzle/meta/_journal.json`
- Create: `drizzle/meta/0001_snapshot.json`

**Interfaces:**
- Produces: `userAddresses` Drizzle 表；字段 `id`, `userId`, `recipientName`, `recipientPhone`, `province`, `city`, `district`, `detailAddress`, `label`, `isDefault`, `createdAt`, `updatedAt`。
- Consumes: `users.id` 外键，删除用户时级联删除地址。

- [ ] **Step 1: 定义地址表**

```ts
export const userAddresses = mysqlTable(
  "user_addresses",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientName: varchar("recipient_name", { length: 100 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 32 }).notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }).notNull(),
    detailAddress: varchar("detail_address", { length: 500 }).notNull(),
    label: varchar("label", { length: 50 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("user_addresses_user_id_idx").on(table.userId),
    index("user_addresses_user_default_idx").on(table.userId, table.isDefault),
  ],
);
```

- [ ] **Step 2: 从 Schema 出口导出地址表并生成迁移**

Run: `npm.cmd run db:generate`

Expected: 生成只包含 `user_addresses` 新表的 `0001` 迁移，不重建已有表。

- [ ] **Step 3: 审查并执行迁移**

Run: `npm.cmd run db:migrate`

Expected: 命令退出码为 0；MySQL 中存在 `user_addresses` 表及两个索引。

- [ ] **Step 4: 提交表结构**

```powershell
git add src/db/schema/address.ts src/db/schema/index.ts drizzle
git commit -m "feat: 添加用户收货地址表"
```

### Task 2: 地址输入与纯业务服务

**Files:**
- Create: `src/features/address/schema.ts`
- Create: `src/features/address/schema.test.ts`
- Create: `src/server/services/address-service.ts`
- Create: `src/server/services/address-service.test.ts`

**Interfaces:**
- Produces: `addressFormSchema`, `AddressInput`, `AddressRecord`, `AddressRepository`, `createAddressService(repository)`。
- Service methods: `list(userId)`, `getForEdit({ userId, addressId })`, `create({ userId, input })`, `update({ userId, addressId, input })`, `remove({ userId, addressId })`, `setDefault({ userId, addressId })`。
- Repository results use explicit statuses: `CREATED`, `UPDATED`, `REMOVED`, `DEFAULT_SET`, `NOT_FOUND`, `LIMIT_REACHED`。

- [ ] **Step 1: 写地址表单校验失败测试**

```ts
test("地址要求完整收货信息并限制字段长度", () => {
  assert.equal(addressFormSchema.safeParse({}).success, false);
  assert.equal(
    addressFormSchema.safeParse({
      recipientName: "张三",
      recipientPhone: "13800138000",
      province: "浙江省",
      city: "杭州市",
      district: "西湖区",
      detailAddress: "文三路 1 号",
      label: "家",
    }).success,
    true,
  );
});
```

- [ ] **Step 2: 运行输入测试确认失败**

Run: `npm.cmd exec tsx -- --test src/features/address/schema.test.ts`

Expected: FAIL，提示 `addressFormSchema` 尚未定义。

- [ ] **Step 3: 实现 Zod Schema**

```ts
export const addressFormSchema = z.object({
  recipientName: z.string().trim().min(2, "请输入收货人姓名").max(100),
  recipientPhone: z.string().trim().regex(/^1\d{10}$/, "请输入正确的手机号"),
  province: z.string().trim().min(1, "请输入省份").max(100),
  city: z.string().trim().min(1, "请输入城市").max(100),
  district: z.string().trim().min(1, "请输入区县").max(100),
  detailAddress: z.string().trim().min(2, "请输入详细地址").max(500),
  label: z.string().trim().max(50).optional().transform((value) => value || undefined),
});
```

- [ ] **Step 4: 写服务权限与结果映射测试**

测试以下行为：空 `userId` 返回 `UNAUTHORIZED`；仓储 `LIMIT_REACHED` 返回“最多保存 20 个地址”；其他用户地址统一映射为 `NOT_FOUND`；成功写操作返回中文消息。

- [ ] **Step 5: 实现最小地址服务并运行测试**

Run: `npm.cmd exec tsx -- --test src/features/address/schema.test.ts src/server/services/address-service.test.ts`

Expected: 地址输入和服务测试全部 PASS。

- [ ] **Step 6: 提交业务规则**

```powershell
git add src/features/address src/server/services/address-service.ts src/server/services/address-service.test.ts
git commit -m "feat: 实现收货地址业务规则"
```

### Task 3: Drizzle 地址仓储与真实事务验证

**Files:**
- Create: `src/server/repositories/address-repository.ts`
- Create: `src/server/repositories/address-repository.integration.test.ts`
- Create: `src/server/addresses.ts`

**Interfaces:**
- Consumes: Task 1 的 `userAddresses` 和 Task 2 的 `AddressRepository`。
- Produces: `addressRepository` 与绑定仓储后的 `addressService`。

- [ ] **Step 1: 写 MySQL 默认地址集成测试**

测试同一用户以下序列：创建第一条地址后自动默认；创建第二条并设为默认后第一条取消默认；第 21 条创建返回 `LIMIT_REACHED`；删除默认地址后最近更新的剩余地址成为默认；其他用户无法编辑、删除或设为默认。

- [ ] **Step 2: 运行数据库测试确认失败**

Run:

```powershell
$env:RUN_DB_TESTS='1'
$env:NODE_OPTIONS='--conditions=react-server'
npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/address-repository.integration.test.ts
```

Expected: FAIL，提示地址仓储尚未实现。

- [ ] **Step 3: 实现事务仓储**

创建地址事务先用 `SELECT ... FOR UPDATE` 锁定该用户已有地址；数量达到 20 返回 `LIMIT_REACHED`；没有地址时强制 `isDefault = true`。设默认先把当前用户全部地址更新为 `false`，再以 `id + userId` 条件设置目标地址。删除默认地址后按 `updatedAt DESC, id DESC` 选出继任地址。

- [ ] **Step 4: 运行数据库测试确认通过**

Run: 使用 Step 2 的命令。

Expected: PASS，测试清理其创建的用户和地址，不影响种子数据。

- [ ] **Step 5: 提交仓储实现**

```powershell
git add src/server/repositories/address-repository.ts src/server/repositories/address-repository.integration.test.ts src/server/addresses.ts
git commit -m "feat: 实现收货地址持久化"
```

### Task 4: 地址 Server Actions 与页面闭环

**Files:**
- Create: `src/app/actions/address.ts`
- Create: `src/features/address/address-form.tsx`
- Create: `src/features/address/address-item-actions.tsx`
- Create: `src/features/address/address-action-input.test.ts`
- Create: `src/app/addresses/page.tsx`
- Create: `src/app/addresses/new/page.tsx`
- Create: `src/app/addresses/[id]/edit/page.tsx`
- Modify: `src/features/site/site-header.tsx`

**Interfaces:**
- Actions: `createAddressAction`, `updateAddressAction`, `removeAddressAction`, `setDefaultAddressAction`。
- Action state: `{ status: "IDLE" | "SUCCESS" | "ERROR"; message: string; fieldErrors?: Record<string, string[]> }`。
- Dynamic edit page uses `PageProps<'/addresses/[id]/edit'>` and `const { id } = await props.params`。

- [ ] **Step 1: 写 Action 输入映射测试**

把 FormData 到 `addressFormSchema` 的转换提取为可测试函数，覆盖字段去空格、非法手机号、非法地址 ID 和缺失字段。

- [ ] **Step 2: 运行 Action 边界测试确认失败**

Run: `npm.cmd exec tsx -- --test src/features/address/address-action-input.test.ts`

Expected: FAIL，输入转换函数尚未定义。

- [ ] **Step 3: 实现 Actions**

每个 Action 调用 `getCurrentSession()`，使用 Zod 解析 FormData，只向服务层传 Session 中的用户 ID。成功后先 `revalidatePath("/addresses")` 与 `revalidatePath("/checkout")`；创建和编辑成功使用 `redirect("/addresses")`，并保证 `redirect` 位于异常捕获之外。

- [ ] **Step 4: 实现地址页面和表单**

地址列表使用 Server Component 读取 `addressService.list`。表单 Client Component 使用 `useActionState` 展示中文字段错误和 pending 状态。删除按钮需要二次确认；默认地址使用清晰标记，空状态提供“新增地址”入口。

- [ ] **Step 5: 验证地址闭环**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: 全部退出码为 0；未登录访问地址页面跳转登录；登录用户可新增、编辑、设默认和删除地址。

- [ ] **Step 6: 提交地址页面**

```powershell
git add src/app/actions/address.ts src/app/addresses src/features/address src/features/site/site-header.tsx
git commit -m "feat: 完成收货地址簿页面"
```
