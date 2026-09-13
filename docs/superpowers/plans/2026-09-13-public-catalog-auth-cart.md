# 公开商品、认证与购物车 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付公开商品 API、Server Component 商城页面、邮箱密码认证以及登录用户真实购物车写入闭环。

**Architecture:** 页面与公开 API 复用 catalog service/repository；Better Auth 管理邮箱密码和数据库 Session；购物车 Server Action 在服务端鉴权、校验库存并调用 cart service/repository。只有表单和按钮是 Client Component，其余读取均为 Server Component。

**Tech Stack:** Next.js 16.3.5、React 19.2.8、TypeScript strict、Tailwind CSS 4、Drizzle ORM 0.45.2、MySQL、Zod 4.6.2、Better Auth 1.7.4、Node test runner + tsx。

**Spec:** `docs/superpowers/specs/2026-09-13-public-catalog-auth-cart-design.md`

## Global Constraints

- TypeScript 项目必须启用严格模式。
- 面向用户的 UI 文案与必要注释使用中文。
- 商品与购物车数据读取使用 Server Component 直接调用服务层。
- 商品列表每页固定 9 条，只展示 ACTIVE 商品和 ACTIVE 分类。
- 金额使用整数分；所有公开输入使用 Zod 校验。
- Server Action 内部重新鉴权，不信任客户端 userId、价格、库存或状态。

---

### Task 1: 测试基础设施与公开查询参数

**Files:**
- Modify: `package.json`
- Create: `src/features/catalog/query.ts`
- Test: `src/features/catalog/query.test.ts`

**Interfaces:**
- Produces: `parseCatalogQuery(input: Record<string, unknown>): CatalogQueryResult`
- Produces: `buildCatalogHref(input: CatalogHrefInput): string`

- [ ] 编写测试，覆盖默认页码、搜索/分类 trim、非法页码及筛选链接保留参数。
- [ ] 运行 `npm test -- src/features/catalog/query.test.ts`，确认因模块或导出缺失而失败。
- [ ] 实现 Zod 查询解析和 URL 构建。
- [ ] 重跑测试并确认通过。

### Task 2: 商品与分类查询服务

**Files:**
- Create: `src/server/repositories/catalog-repository.ts`
- Create: `src/server/services/catalog-service.ts`
- Test: `src/server/services/catalog-service.test.ts`

**Interfaces:**
- Produces: `listProducts(query): Promise<ProductListDto>`
- Produces: `getProductById(id): Promise<ProductDetailDto | null>`
- Produces: `getProductBySlug(slug): Promise<ProductDetailDto | null>`
- Produces: `listCategories(): Promise<CategoryDto[]>`

- [ ] 编写使用显式 repository fake 的服务测试，覆盖分页 DTO、详情 404 语义和分类计数 DTO。
- [ ] 运行定向测试并确认失败原因是服务尚未实现。
- [ ] 用 Drizzle 实现 ACTIVE 范围、模糊搜索、分类 slug、计数、排序与详情关联。
- [ ] 实现只暴露页面所需字段的 service DTO。
- [ ] 重跑相关测试并确认通过。

### Task 3: 公开 Route Handlers

**Files:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/route.ts`
- Create: `src/app/api/categories/route.ts`
- Test: `src/app/api/catalog-routes.test.ts`

**Interfaces:**
- Consumes: Task 1 查询解析、Task 2 catalog service。
- Produces: 三个公开 GET HTTP 契约。

- [ ] 编写 HTTP 边界测试，覆盖 200、非法 page/ID 的 400、缺失详情的 404。
- [ ] 运行测试并确认 Route Handler 缺失导致失败。
- [ ] 实现 handlers，Next.js 动态参数通过 `await context.params` 获取。
- [ ] 重跑测试并确认通过。

### Task 4: Server Component 商城页面

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/products/[slug]/page.tsx`
- Create: `src/features/catalog/product-card.tsx`
- Create: `src/features/catalog/catalog-filters.tsx`
- Create: `src/features/catalog/pagination.tsx`
- Create: `src/features/catalog/product-visual.tsx`
- Create: `src/lib/money.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: Task 1 URL helper、Task 2 service DTO。
- Produces: `/` 与 `/products/[slug]` Server Component 页面。

- [ ] 编写金额格式化和可复用展示逻辑测试，确认新模块缺失时失败。
- [ ] 实现首页并行数据读取、GET 搜索表单、分类标签、9 列表项分页和空状态。
- [ ] 实现详情页、库存状态与无图占位视觉。
- [ ] 重跑测试、typecheck，修复类型问题。

### Task 5: Better Auth 注册登录

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `src/lib/env.ts`
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-client.ts`
- Create: `src/server/auth/session.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `src/features/auth/schema.ts`
- Create: `src/features/auth/auth-form.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`
- Test: `src/features/auth/schema.test.ts`

**Interfaces:**
- Produces: `auth`、`authClient`、`getCurrentSession()`、`requireUser()`。
- Produces: `loginSchema`、`registerSchema` 与中文错误。

- [ ] 安装精确依赖 `better-auth@1.7.4`。
- [ ] 编写注册/登录 Zod 测试，覆盖邮箱、8 位密码、姓名与安全 next 地址。
- [ ] 运行测试并确认失败。
- [ ] 显式映射已有复数认证表，挂载 Next.js handler，配置环境变量校验。
- [ ] 实现注册/登录页及最小 Client form；成功后回到安全站内地址。
- [ ] 重跑测试与 typecheck。

### Task 6: 登录用户购物车写入与读取

**Files:**
- Create: `src/features/cart/schema.ts`
- Create: `src/server/repositories/cart-repository.ts`
- Create: `src/server/services/cart-service.ts`
- Create: `src/app/actions/cart.ts`
- Create: `src/features/cart/add-to-cart-button.tsx`
- Create: `src/app/cart/page.tsx`
- Modify: `src/app/products/[slug]/page.tsx`
- Test: `src/server/services/cart-service.test.ts`

**Interfaces:**
- Produces: `addCartItem(input, deps): Promise<CartMutationResult>`。
- Produces: `listCartItems(userId): Promise<CartItemDto[]>`。
- Produces: `addToCartAction(previousState, formData): Promise<AddToCartState>`。

- [ ] 编写服务测试，覆盖未登录、不可售、零库存、超过库存、首次新增和重复累加。
- [ ] 运行测试并确认失败。
- [ ] 实现 repository 事务写入和按用户读取，始终从 Session 派生 userId。
- [ ] 实现 Server Action、按钮 pending/成功/失败状态以及未登录跳转。
- [ ] 实现 `/cart` Server Component，并将按钮接入商品详情页。
- [ ] 重跑测试与 typecheck。

### Task 7: 数据库与完整验证

**Files:**
- Modify as required by verified defects only.

**Interfaces:**
- Consumes: Tasks 1-6 的全部公共接口。
- Produces: 可构建、可运行的完整商品—认证—购物车闭环。

- [ ] 在本地 MySQL 执行商品 API 与分类计数集成检查。
- [ ] 注册测试用户并验证 Session Cookie、登录和 `cart_items` 真实写入。
- [ ] 运行 `npm test`、`npm run lint`、`npm run typecheck`、`npm run build`。
- [ ] 检查 `git diff`，确认没有 `.env`、密码、Cookie、token 或数据库数据进入提交范围。
