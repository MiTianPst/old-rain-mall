# Product Discovery and Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为旧雨电商实现高级筛选排序、收藏、最近浏览、已购评价与确定性相关推荐。

**Architecture:** 保持 Next.js 模块化单体，由 Server Component 读取服务层 DTO，Server Action 承担写操作，Drizzle Repository 执行 MySQL 查询。新增 engagement 与 review 服务边界，目录职责遵循现有 catalog、cart、order 模式。

**Tech Stack:** Next.js 16.3.5、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、MySQL 8.4 LTS、Drizzle ORM 0.45.2、Zod 4.6.2、Node.js 24。

**Spec:** `docs/superpowers/specs/2026-09-14-product-discovery-engagement-design.md`

## Global Constraints

- 金额使用整数分，URL 价格筛选使用整数元。
- UI 文案与必要注释使用中文。
- 默认使用 Server Component；交互状态和足迹触发使用 Client Component。
- 每个 Server Action 重新鉴权并用 Zod 校验。
- 不引入 Elasticsearch、Redis、消息队列或新运行时依赖。
- 迁移由 `npm run db:generate` 生成，不手写 SQL。
- 实现使用 TDD；数据库集成测试默认跳过。
- 当前工作区有上一阶段未提交改动，每次只暂存任务列出的文件。

---

### Task 1: 互动数据表与迁移

**Files:**
- Modify: `src/db/schema/commerce.ts`
- Create: `src/db/schema/engagement.test.ts`
- Create: `drizzle/0009_*.sql`
- Create: `drizzle/meta/0009_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**
- Produces: `favorites`、`productViews`、`productReviews`、`reviewStatuses`。
- Consumes: `users`、`products`、`orderItems` 外键。

- [ ] **Step 1: 写失败的 schema 约束测试**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/mysql-core";
import { favorites, productReviews, productViews } from "./commerce";

test("互动表包含用户商品唯一约束和评价星级检查", () => {
  const favoriteConfig = getTableConfig(favorites);
  const viewConfig = getTableConfig(productViews);
  const reviewConfig = getTableConfig(productReviews);
  assert.ok(favoriteConfig.indexes.some((item) => item.config.name === "favorites_user_product_unique"));
  assert.ok(viewConfig.indexes.some((item) => item.config.name === "product_views_user_product_unique"));
  assert.ok(reviewConfig.indexes.some((item) => item.config.name === "product_reviews_user_product_unique"));
  assert.ok(reviewConfig.checks.some((item) => item.name === "product_reviews_rating_check"));
});
```

- [ ] **Step 2: 运行测试并确认导出缺失**

Run: `npx.cmd tsx --test src/db/schema/engagement.test.ts`

Expected: FAIL，提示互动表未导出。

- [ ] **Step 3: 实现三个 Drizzle 表**

```ts
export const reviewStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;

export const favorites = mysqlTable("favorites", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id", { unsigned: true }).notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("favorites_user_product_unique").on(table.userId, table.productId),
  index("favorites_user_created_idx").on(table.userId, table.createdAt),
]);

export const productViews = mysqlTable("product_views", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("product_id", { unsigned: true }).notNull().references(() => products.id, { onDelete: "cascade" }),
  viewCount: int("view_count", { unsigned: true }).notNull().default(1),
  lastViewedAt: timestamp("last_viewed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("product_views_user_product_unique").on(table.userId, table.productId),
  index("product_views_user_last_viewed_idx").on(table.userId, table.lastViewedAt),
]);

export const productReviews = mysqlTable("product_reviews", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "restrict" }),
  productId: int("product_id", { unsigned: true }).notNull().references(() => products.id, { onDelete: "restrict" }),
  orderItemId: int("order_item_id", { unsigned: true }).notNull().references(() => orderItems.id, { onDelete: "restrict" }),
  rating: tinyint("rating", { unsigned: true }).notNull(),
  content: varchar("content", { length: 1000 }).notNull(),
  status: mysqlEnum("status", reviewStatuses).notNull().default("PENDING"),
  reviewNote: varchar("review_note", { length: 500 }),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id, { onDelete: "restrict" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => [
  uniqueIndex("product_reviews_user_product_unique").on(table.userId, table.productId),
  index("product_reviews_product_status_created_idx").on(table.productId, table.status, table.createdAt),
  index("product_reviews_status_created_idx").on(table.status, table.createdAt),
  check("product_reviews_rating_check", sql`${table.rating} between 1 and 5`),
]);
```

- [ ] **Step 4: 验证并生成迁移**

Run: `npx.cmd tsx --test src/db/schema/engagement.test.ts`

Expected: PASS。

Run: `npm.cmd run db:generate`

Expected: 新迁移只创建 favorites、product_views、product_reviews 及其约束。

- [ ] **Step 5: 提交 schema 与迁移**

```powershell
git add src/db/schema/commerce.ts src/db/schema/engagement.test.ts drizzle
git commit -m "feat: add product engagement schema"
```

### Task 2: 高级商品筛选和排序

**Files:**
- Modify: `src/features/catalog/query.ts`
- Modify: `src/features/catalog/query.test.ts`
- Modify: `src/server/services/catalog-service.ts`
- Modify: `src/server/services/catalog-service.test.ts`
- Modify: `src/server/repositories/catalog-repository.ts`
- Modify: `src/features/catalog/catalog-filters.tsx`
- Modify: `src/features/catalog/pagination.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/api/catalog-http.ts`
- Modify: `src/app/api/catalog-http.test.ts`

**Interfaces:**
- Produces: `CatalogSort` 和扩展的 `CatalogQuery`。
- Repository consumes: `minPriceCents`、`maxPriceCents`、`inStock`、`sort`。

- [ ] **Step 1: 写查询解析失败测试**

```ts
test("解析价格库存排序并保留分页参数", () => {
  const query = parseCatalogQuery({
    minPrice: "1000", maxPrice: "5000", inStock: "true", sort: "price_asc", page: "2",
  });
  assert.deepEqual(query, {
    search: "", category: "", minPrice: 1000, maxPrice: 5000,
    inStock: true, sort: "price_asc", page: 2,
  });
  assert.equal(
    buildCatalogHref(query),
    "/?minPrice=1000&maxPrice=5000&inStock=true&sort=price_asc&page=2#catalog",
  );
});

test("拒绝倒置价格区间和未知排序", () => {
  assert.throws(() => parseCatalogQuery({ minPrice: "5000", maxPrice: "1000" }), /最低价格不能高于最高价格/);
  assert.throws(() => parseCatalogQuery({ sort: "random" }), /排序方式不正确/);
});
```

- [ ] **Step 2: 运行测试并确认新增字段缺失**

Run: `npx.cmd tsx --test src/features/catalog/query.test.ts`

Expected: FAIL，实际查询对象缺少四个新字段。

- [ ] **Step 3: 实现查询契约与 Repository 条件**

```ts
export const catalogSorts = ["newest", "price_asc", "price_desc", "sales"] as const;
export type CatalogSort = (typeof catalogSorts)[number];
```

Zod 将空价格转为 null，整数元限制为 0 到 100000000，`inStock` 只接受 `true`，排序默认 `newest`。Repository 使用在售 SKU 最低价表达式过滤和排序，库存条件使用存在库存大于零的在售 SKU。

- [ ] **Step 4: 更新筛选 UI 和公开 API**

```tsx
<input name="minPrice" type="number" min="0" step="1" defaultValue={query.minPrice ?? ""} aria-label="最低价格" />
<input name="maxPrice" type="number" min="0" step="1" defaultValue={query.maxPrice ?? ""} aria-label="最高价格" />
<label><input name="inStock" type="checkbox" value="true" defaultChecked={query.inStock} />仅看有货</label>
<select name="sort" defaultValue={query.sort} aria-label="商品排序">
  <option value="newest">最新上架</option>
  <option value="sales">销量优先</option>
  <option value="price_asc">价格从低到高</option>
  <option value="price_desc">价格从高到低</option>
</select>
```

Run: `npx.cmd tsx --test src/features/catalog/query.test.ts src/server/services/catalog-service.test.ts src/app/api/catalog-http.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交筛选排序**

```powershell
git add src/features/catalog src/server/services/catalog-service.ts src/server/services/catalog-service.test.ts src/server/repositories/catalog-repository.ts src/app/page.tsx src/app/api/catalog-http.ts src/app/api/catalog-http.test.ts
git commit -m "feat: add advanced catalog filters"
```

### Task 3: 商品收藏

**Files:**
- Create: `src/server/services/engagement-service.ts`
- Create: `src/server/services/engagement-service.test.ts`
- Create: `src/server/repositories/engagement-repository.ts`
- Create: `src/server/engagement.ts`
- Create: `src/app/actions/favorite.ts`
- Create: `src/features/engagement/favorite-button.tsx`
- Modify: `src/features/catalog/product-card.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/products/[slug]/page.tsx`
- Create: `src/app/account/favorites/page.tsx`
- Modify: `src/app/account/page.tsx`

**Interfaces:**
- Produces: `toggleFavorite`、`getFavoriteProductIds`、`listFavorites`。
- UI consumes: `FavoriteButton({ productId, initialFavorited, returnTo })`。

- [ ] **Step 1: 写收藏服务失败测试**

```ts
test("收藏拒绝匿名和冻结用户并返回稳定状态", async () => {
  assert.deepEqual(
    await service.toggleFavorite({ userId: null, productId: 1, nextFavorited: true }),
    { ok: false, code: "UNAUTHORIZED", message: "请先登录后再收藏商品" },
  );
  assert.deepEqual(
    await service.toggleFavorite({ userId: "u1", userStatus: "FROZEN", productId: 1, nextFavorited: true }),
    { ok: false, code: "USER_FROZEN", message: "当前账户已被冻结，暂时不能收藏商品" },
  );
});
```

- [ ] **Step 2: 运行测试并确认 service 不存在**

Run: `npx.cmd tsx --test src/server/services/engagement-service.test.ts`

Expected: FAIL，无法导入 engagement service。

- [ ] **Step 3: 实现服务、Repository 和 Server Action**

```ts
type FavoriteCommandResult =
  | { ok: true; favorited: boolean; message: string }
  | { ok: false; code: "UNAUTHORIZED" | "USER_FROZEN" | "PRODUCT_UNAVAILABLE"; message: string };
```

收藏使用唯一索引保证幂等；取消使用 userId 与 productId 条件删除。Action 解析 productId、nextFavorited、returnTo，调用 `getActiveUserIdentity`，成功后刷新当前路径和 `/account/favorites`。

- [ ] **Step 4: 接入商品卡、详情与收藏页**

```tsx
<FavoriteButton
  productId={product.id}
  initialFavorited={favoriteProductIds.includes(product.id)}
  returnTo={returnTo}
/>
```

首页批量读取可见商品收藏 ID，详情读取单商品状态，收藏页只查询当前用户仍公开可售的商品。

Run: `npx.cmd tsx --test src/server/services/engagement-service.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交收藏功能**

```powershell
git add src/server/engagement.ts src/server/services/engagement-service.ts src/server/services/engagement-service.test.ts src/server/repositories/engagement-repository.ts src/app/actions/favorite.ts src/features/engagement/favorite-button.tsx src/features/catalog/product-card.tsx src/app/page.tsx src/app/products src/app/account
git commit -m "feat: add product favorites"
```

### Task 4: 最近浏览

**Files:**
- Modify: `src/server/services/engagement-service.ts`
- Modify: `src/server/services/engagement-service.test.ts`
- Modify: `src/server/repositories/engagement-repository.ts`
- Create: `src/app/actions/product-view.ts`
- Create: `src/features/engagement/product-view-tracker.tsx`
- Create: `src/features/engagement/clear-history-button.tsx`
- Modify: `src/app/products/[slug]/page.tsx`
- Create: `src/app/account/history/page.tsx`
- Modify: `src/app/account/page.tsx`

**Interfaces:**
- Produces: `recordView`、`listRecentViews`、`clearHistory`。
- UI consumes: `ProductViewTracker({ productId })` 和 `ClearHistoryButton`。

- [ ] **Step 1: 写足迹服务失败测试**

```ts
test("匿名浏览静默跳过，登录浏览保留最近三十条", async () => {
  assert.deepEqual(await service.recordView({ userId: null, productId: 1 }), { ok: true, recorded: false });
  assert.deepEqual(
    await service.recordView({ userId: "u1", userStatus: "ACTIVE", productId: 1 }),
    { ok: true, recorded: true },
  );
  assert.deepEqual(repository.recordCalls, [{ userId: "u1", productId: 1, keep: 30 }]);
});
```

- [ ] **Step 2: 运行测试并确认 recordView 缺失**

Run: `npx.cmd tsx --test src/server/services/engagement-service.test.ts`

Expected: FAIL，`recordView` 不是函数。

- [ ] **Step 3: 实现 upsert、裁剪和清空**

```ts
async recordView(input) {
  if (!input.userId || input.userStatus !== "ACTIVE") return { ok: true, recorded: false };
  await repository.recordView({ userId: input.userId, productId: input.productId, keep: 30 });
  return { ok: true, recorded: true };
}
```

Repository 在事务中执行 `onDuplicateKeyUpdate`，更新 lastViewedAt 与 viewCount；随后删除该用户第 31 位以后的记录。清空按当前 userId 删除。

- [ ] **Step 4: 接入详情追踪和足迹页**

```tsx
"use client";
export function ProductViewTracker({ productId }: { productId: number }) {
  useEffect(() => {
    void recordProductViewAction(productId);
  }, [productId]);
  return null;
}
```

清空按钮第一次点击切换为“确认清空”，第二次提交 Action；成功后刷新 `/account/history`。

Run: `npx.cmd tsx --test src/server/services/engagement-service.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交足迹功能**

```powershell
git add src/server/services/engagement-service.ts src/server/services/engagement-service.test.ts src/server/repositories/engagement-repository.ts src/app/actions/product-view.ts src/features/engagement src/app/products src/app/account
git commit -m "feat: add recent product history"
```

### Task 5: 已购评价与后台审核

**Files:**
- Create: `src/features/review/schema.ts`
- Create: `src/features/review/schema.test.ts`
- Create: `src/features/review/review-form.tsx`
- Create: `src/features/review/review-list.tsx`
- Create: `src/server/services/review-service.ts`
- Create: `src/server/services/review-service.test.ts`
- Create: `src/server/repositories/review-repository.ts`
- Create: `src/server/reviews.ts`
- Create: `src/app/actions/review.ts`
- Modify: `src/app/products/[slug]/page.tsx`
- Modify: `src/app/orders/[orderNo]/page.tsx`
- Create: `src/app/admin/(protected)/reviews/page.tsx`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- Produces: `submitReview`、`getReviewEligibility`、`getPublicReviews`、`getReviewSummary`、`listAdminReviews`、`moderateReview`。
- Public DTO excludes: userId、email、orderNo、reviewNote、reviewedBy。

- [ ] **Step 1: 写评价输入和资格失败测试**

```ts
test("评价要求一到五星和五到一千字", () => {
  assert.deepEqual(parseReviewInput({
    productId: "1", orderItemId: "2", rating: "5", content: "  商品很好用  ",
  }), { productId: 1, orderItemId: 2, rating: 5, content: "商品很好用" });
  assert.throws(() => parseReviewInput({
    productId: "1", orderItemId: "2", rating: "6", content: "商品很好用",
  }), /评分必须是 1 到 5/);
});

test("只有已支付且已收货订单可以提交一次评价", async () => {
  repository.eligibility = { eligible: true, orderItemId: 2 };
  assert.deepEqual(
    await service.submit({
      userId: "u1", userStatus: "ACTIVE", productId: 1,
      orderItemId: 2, rating: 5, content: "商品很好用",
    }),
    { ok: true, status: "PENDING", message: "评价已提交，审核通过后展示" },
  );
});
```

- [ ] **Step 2: 运行测试并确认评价模块不存在**

Run: `npx.cmd tsx --test src/features/review/schema.test.ts src/server/services/review-service.test.ts`

Expected: FAIL，评价 schema 或 service 无法导入。

- [ ] **Step 3: 实现评价提交和公开查询**

```ts
const reviewInputSchema = z.object({
  productId: z.coerce.number().int().positive(),
  orderItemId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int("评分必须是 1 到 5").min(1, "评分必须是 1 到 5").max(5, "评分必须是 1 到 5"),
  content: z.string().trim().min(5, "评价内容至少 5 个字").max(1000, "评价内容不能超过 1000 个字"),
});
```

资格查询连接 orders 与 order_items，限定当前 userId、productId、orderItemId、paymentStatus SUCCESS 和订单状态 DELIVERED/COMPLETED。公开查询固定 APPROVED，并返回脱敏用户名、评分、内容和日期。

- [ ] **Step 4: 实现管理员审核与审计**

```ts
type ModerateReviewInput = {
  adminUserId: string | null;
  reviewId: number;
  decision: "APPROVED" | "REJECTED";
  reviewNote: string;
  now: Date;
};
```

审核事务锁定 PENDING 评价，写入状态、审核人、备注、时间和 audit_logs；非管理员、评价不存在或已审核返回稳定错误。

- [ ] **Step 5: 接入商品详情、订单详情和后台**

```tsx
<ReviewSummary averageRating={summary.averageRating} total={summary.total} distribution={summary.distribution} />
<ReviewList reviews={reviews.data} pagination={reviews.pagination} />
{eligibility.eligible ? <ReviewForm productId={product.id} orderItemId={eligibility.orderItemId} /> : null}
```

后台 `/admin/reviews` 按状态筛选；PENDING 记录显示通过和拒绝表单。

Run: `npx.cmd tsx --test src/features/review/schema.test.ts src/server/services/review-service.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交评价功能**

```powershell
git add src/features/review src/server/reviews.ts src/server/services/review-service.ts src/server/services/review-service.test.ts src/server/repositories/review-repository.ts src/app/actions/review.ts src/app/products src/app/orders src/app/admin
git commit -m "feat: add verified product reviews"
```

### Task 6: 相关推荐与整体验收

**Files:**
- Modify: `src/server/services/catalog-service.ts`
- Modify: `src/server/services/catalog-service.test.ts`
- Modify: `src/server/repositories/catalog-repository.ts`
- Create: `src/features/catalog/related-products.tsx`
- Modify: `src/app/products/[slug]/page.tsx`
- Create: `src/server/repositories/product-engagement.integration.test.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `catalogService.listRelatedProducts({ productId, categoryId, limit })`。
- Page consumes: 最多四个 ProductCardDto；空数组不渲染。

- [ ] **Step 1: 写推荐服务失败测试**

```ts
test("相关推荐排除当前商品并限制四件", async () => {
  repository.relatedProducts = [product(2), product(3), product(4), product(5), product(6)];
  const result = await service.listRelatedProducts({ productId: 1, categoryId: 10, limit: 4 });
  assert.deepEqual(result.map((item) => item.id), [2, 3, 4, 5]);
  assert.deepEqual(repository.relatedInput, { productId: 1, categoryId: 10, limit: 4 });
});
```

- [ ] **Step 2: 运行测试并确认推荐接口不存在**

Run: `npx.cmd tsx --test src/server/services/catalog-service.test.ts`

Expected: FAIL，`listRelatedProducts` 不是函数。

- [ ] **Step 3: 实现推荐查询和组件**

```ts
async listRelatedProducts(input: { productId: number; categoryId: number; limit: number }) {
  const limit = Math.max(1, Math.min(4, input.limit));
  const rows = await repository.listRelatedProducts({ ...input, limit });
  return rows.slice(0, limit).map(toProductCardDto);
}
```

Repository 限定公开商品、排除当前 ID，按同分类、销量、创建时间和 ID 排序。详情页并行读取推荐、评价和收藏数据。

- [ ] **Step 4: 增加可选 MySQL 集成测试**

```ts
test("MySQL 保证收藏唯一、足迹裁剪和评价审核约束", { skip: !process.env.RUN_DB_TESTS }, async () => {
  const fixture = await createEngagementFixture();
  await assertFavoriteUniqueness(fixture);
  await assertViewRetention(fixture, 30);
  await assertReviewModeration(fixture);
});
```

测试工具在同一测试文件中实现 fixture、断言和 finally 清理，并使用唯一后缀隔离测试数据。

- [ ] **Step 5: 更新文档并执行基础验证**

在 CLAUDE.md 当前状态加入：

```markdown
- 已完成高级商品筛选排序、收藏、最近浏览、已购评价审核和同类推荐。
```

Run: `npm.cmd test`

Run: `npm.cmd run typecheck`

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: 单元测试零失败；类型、Lint 和构建退出码为 0；构建路由包含 `/account/favorites`、`/account/history` 和 `/admin/reviews`。

- [ ] **Step 6: 浏览器基础验收**

```text
匿名：首页组合筛选与排序可用，收藏引导登录，详情只展示已审核评价。
普通用户：收藏切换、足迹记录、收藏页、足迹页和符合资格时提交评价可用。
管理员：待审核列表可以通过或拒绝，公开评价随审核结果更新。
```

检查桌面与 390px 宽度，无横向溢出，所有交互文案为中文。

- [ ] **Step 7: 提交推荐和收尾**

```powershell
git add src/server/services/catalog-service.ts src/server/services/catalog-service.test.ts src/server/repositories/catalog-repository.ts src/features/catalog/related-products.tsx src/app/products src/server/repositories/product-engagement.integration.test.ts CLAUDE.md
git commit -m "feat: add related product recommendations"
```
