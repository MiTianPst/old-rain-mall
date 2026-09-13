# Admin Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为旧雨电商实现仅管理员可访问的商品、分类和订单后台管理。

**Architecture:** 后台页面使用 Server Component 读取专用管理服务，Server Action 负责重新鉴权、Zod 输入校验和缓存刷新。Drizzle 仓储处理唯一冲突、商品 `version` 乐观锁以及订单显式状态转换，公开商城与后台共享现有数据库 Schema，但不共享可写入口。

**Tech Stack:** Next.js 16.3.5 App Router、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、Drizzle ORM 0.45.2、MySQL 8.4、Zod 4.6.2

**Spec:** `docs/superpowers/specs/2026-09-13-admin-management-design.md`

## Global Constraints

- 所有 `/admin/**` 页面和 Action 在服务端验证数据库 Session 的 `ADMIN` 角色。
- 商品归档、分类隐藏代替硬删除；订单只允许 `PAID -> SHIPPED -> COMPLETED`。
- 金额以整数分进入服务层；浏览器不得提交订单金额、支付状态或会员数据。
- 商品编辑使用现有 `version` 字段做乐观锁。
- 用户已要求先完成全部项目功能，因此本阶段不创建或运行测试，不执行中间代码审查；测试项保留到最终统一验收。
- UI 文案和必要注释使用中文，页面默认使用 Server Component。

---

### Task 1: 管理员权限与后台布局

**Files:**
- Create: `src/server/admin/auth.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/forbidden/page.tsx`
- Modify: `src/features/auth/user-navigation.tsx`

**Interfaces:**
- Produces: `getAdminSession(): Promise<{ user: { id: string; role: "ADMIN"; name: string } } | null>`。
- Produces: `requireAdminPage()`，匿名用户跳转登录，普通用户跳转 `/admin/forbidden`。
- Produces: `getAdminDashboardCounts()`，返回商品、分类、订单和待发货数量。

- [ ] **Step 1:** 读取 Better Auth Session，并再次以 `users.id` 查询角色，避免仅依赖客户端或陈旧 Session 字段。
- [ ] **Step 2:** 建立后台布局、中文导航、无权限页和概览卡片。
- [ ] **Step 3:** 仅在当前 Session 是管理员时，在用户导航显示“管理后台”。
- [ ] **Step 4:** 运行 `next typegen`、针对性 ESLint、`typecheck`、`git diff --check`，不运行测试。
- [ ] **Step 5:** 提交 `feat: 添加后台权限与管理布局`。

### Task 2: 商品管理纵向切片

**Files:**
- Create: `src/features/admin/product-schema.ts`
- Create: `src/server/services/admin-product-service.ts`
- Create: `src/server/repositories/admin-product-repository.ts`
- Create: `src/server/admin-products.ts`
- Create: `src/app/actions/admin-product.ts`
- Create: `src/features/admin/product-form.tsx`
- Create: `src/features/admin/product-row-actions.tsx`
- Create: `src/app/admin/products/page.tsx`
- Create: `src/app/admin/products/new/page.tsx`
- Create: `src/app/admin/products/[id]/edit/page.tsx`

**Interfaces:**
- `AdminProductInput`: `categoryId`, `name`, `slug`, `summary`, `description`, `priceCents`, `stock`, `status`, `coverUrl`。
- `AdminProductRepository`: `list`, `getById`, `create`, `update({ id, version, input })`, `archive({ id, version })`。
- 稳定结果：`CREATED`, `UPDATED`, `ARCHIVED`, `NOT_FOUND`, `CONFLICT`, `SLUG_CONFLICT`。

- [ ] **Step 1:** Zod 白名单解析表单；人民币元字符串通过十进制格式校验后转换为安全整数分，不使用浮点乘法保存。
- [ ] **Step 2:** 仓储实现搜索/状态分页、分类读取、slug 冲突映射、`id + version` 条件更新与归档。
- [ ] **Step 3:** 服务和 Action 重新验证管理员身份；成功后刷新后台商品页、首页和商品详情相关路径。
- [ ] **Step 4:** 实现中文商品列表、新增/编辑表单、状态筛选、分页、乐观锁冲突提示和归档确认。
- [ ] **Step 5:** 运行静态检查并提交 `feat: 完成后台商品管理`。

### Task 3: 分类管理纵向切片

**Files:**
- Create: `src/features/admin/category-schema.ts`
- Create: `src/server/services/admin-category-service.ts`
- Create: `src/server/repositories/admin-category-repository.ts`
- Create: `src/server/admin-categories.ts`
- Create: `src/app/actions/admin-category.ts`
- Create: `src/features/admin/category-manager.tsx`
- Create: `src/app/admin/categories/page.tsx`

**Interfaces:**
- `AdminCategoryInput`: `name`, `slug`, `description`, `sortOrder`, `status`。
- `AdminCategoryRepository`: `list`, `create`, `update`, `setStatus`。
- 稳定结果：`CREATED`, `UPDATED`, `STATUS_CHANGED`, `NOT_FOUND`, `SLUG_CONFLICT`。

- [ ] **Step 1:** Zod 校验数据库真实长度、非负排序值和 `ACTIVE/HIDDEN` 枚举。
- [ ] **Step 2:** 仓储依赖唯一索引处理 slug 竞争，不提供删除方法。
- [ ] **Step 3:** Action 执行管理员校验并刷新后台分类、商品表单、公开首页和分类 API。
- [ ] **Step 4:** 实现同页新增、编辑和显示/隐藏操作，提供 pending、错误与确认状态。
- [ ] **Step 5:** 运行静态检查并提交 `feat: 完成后台分类管理`。

### Task 4: 订单管理纵向切片

**Files:**
- Create: `src/features/admin/order-schema.ts`
- Create: `src/server/services/admin-order-service.ts`
- Create: `src/server/repositories/admin-order-repository.ts`
- Create: `src/server/admin-orders.ts`
- Create: `src/app/actions/admin-order.ts`
- Create: `src/features/admin/order-status-actions.tsx`
- Create: `src/app/admin/orders/page.tsx`
- Create: `src/app/admin/orders/[orderNo]/page.tsx`

**Interfaces:**
- `AdminOrderRepository`: `list({ search, status, page })`, `getByOrderNo`, `markShipped`, `markCompleted`。
- 状态命令结果：`UPDATED`, `NOT_FOUND`, `INVALID_STATE`。
- Action 只接收 `orderNo` 和固定命令，不接收目标状态或任何金额字段。

- [ ] **Step 1:** 实现订单号、状态筛选和分页输入校验。
- [ ] **Step 2:** 仓储读取订单/商品快照/用户信息；条件更新保证只有 `PAID -> SHIPPED` 与 `SHIPPED -> COMPLETED`。
- [ ] **Step 3:** Action 重新验证管理员并刷新后台/用户订单列表和详情。
- [ ] **Step 4:** 实现订单搜索筛选列表、详情金额/地址/商品快照与显式发货、完成按钮。
- [ ] **Step 5:** 运行静态检查并提交 `feat: 完成后台订单管理`。

### Task 5: 项目状态与最终统一验收清单

**Files:**
- Modify: `CLAUDE.md`
- Future Test: `src/server/services/admin-product-service.test.ts`
- Future Test: `src/server/services/admin-category-service.test.ts`
- Future Test: `src/server/repositories/admin-order-repository.integration.test.ts`

- [ ] **Step 1:** 更新项目状态、后台路由、归档/隐藏/订单状态规则。
- [ ] **Step 2:** 记录最终测试用例：匿名与普通用户拒绝、商品 slug 冲突、价格分转换、version 冲突、分类隐藏、非法订单转换和合法订单转换。
- [ ] **Step 3:** 项目全部功能完成后统一运行 `npm test`、MySQL 集成测试、`npm run typecheck`、`npm run lint`、`npm run build` 和浏览器验收。
- [ ] **Step 4:** 本阶段仅提交文档 `docs: 更新后台管理模块状态`；测试实现与运行遵循用户后续统一验收指令。

