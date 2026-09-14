# 旧雨电商暖白轻奢首页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将旧雨电商首页升级为暖白轻奢科技商城，并接入真实推荐、新品、热销、会员价格和快速加购能力。

**Architecture:** 保留 App Router Server Component 作为首页数据入口，新增独立的首页 repository/service 聚合有限数量的运营数据；商品总览继续复用 catalog 服务。商品运营字段进入现有商品管理链路，客户端状态只存在于快速加购按钮。

**Tech Stack:** Next.js 16.3.5、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、MySQL 8.4、Drizzle ORM 0.45.2、Zod 4.6.2、Node test runner

**Spec:** `docs/superpowers/specs/2026-09-14-premium-homepage-design.md`

## Global Constraints

- Next.js 固定为 16.3.5；修改页面前阅读 `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`、`04-linking-and-navigating.md`、`12-images.md` 和 `node_modules/next/dist/docs/01-app/02-guides/forms.md`。
- TypeScript 必须保持 `strict: true`。
- UI 文案与必要注释使用中文。
- 使用 Tailwind CSS 4.3.3，不新增业务 CSS 文件或 UI 依赖。
- 首页数据获取使用 Server Component；仅快速加购使用 Client Component。
- 热销数量只统计支付成功且未退款的订单。
- 执行聚焦的单元测试、typecheck、lint 和 build；不扩大到全量数据库集成测试。

---

## File Structure

- Modify `src/db/schema/catalog.ts`: 增加商品运营字段与推荐查询索引。
- Create `drizzle/0008_*.sql` and update `drizzle/meta/*`: 由 Drizzle Kit 生成迁移与元数据。
- Modify `src/features/admin/product-schema.ts`: 校验并归一化运营字段。
- Modify `src/features/admin/product-schema.test.ts`: 覆盖原价、推荐顺序和促销标签边界。
- Modify `src/features/admin/product-form.tsx`: 提供后台运营配置表单。
- Modify `src/server/services/admin-product-service.ts`: 扩展后台商品类型。
- Modify `src/server/repositories/admin-product-repository.ts`: 读写运营字段。
- Modify `src/server/services/catalog-service.ts`: 扩展商品卡片 DTO。
- Modify `src/server/repositories/catalog-repository.ts`: 返回运营字段和全部有效 SKU 摘要。
- Create `src/server/services/homepage-service.ts`: 首页 DTO、会员价与空区降级规则。
- Create `src/server/services/homepage-service.test.ts`: 聚焦首页组合逻辑。
- Create `src/server/repositories/homepage-repository.ts`: 推荐、新品、热销的有限查询。
- Create `src/server/homepage.ts`: 绑定 repository 与 service。
- Create `src/features/home/home-hero.tsx`: 暖白首屏、搜索和主按钮。
- Create `src/features/home/category-shortcuts.tsx`: 分类快捷入口。
- Create `src/features/home/commerce-highlights.tsx`: 限时、新品、热销运营入口。
- Create `src/features/home/product-showcase.tsx`: 运营商品横向展示区。
- Create `src/features/home/membership-panel.tsx`: 会员规则与登录用户进度。
- Create `src/features/home/service-promises.tsx`: 服务保障区。
- Create `src/features/home/site-footer.tsx`: 完整页脚。
- Create `src/features/catalog/quick-purchase.tsx`: 单 SKU 快速加购或多 SKU 详情跳转。
- Modify `src/features/catalog/product-card.tsx`: 展示原价、促销、销量、会员价与快捷操作。
- Modify `src/features/catalog/catalog-filters.tsx`: 支持 `#catalog` 锚点和暖白视觉。
- Modify `src/features/site/site-header.tsx`: 新导航、服务公告和响应式布局。
- Modify `src/app/layout.tsx`: 使用完整页脚并更新元数据文案。
- Modify `src/app/page.tsx`: 并行装配首页内容和商品总览。
- Create `src/app/error.tsx`: 数据异常中文错误边界。
- Modify `src/db/seed.ts`: 为示例科技商品补充运营数据。

---

### Task 1: 商品运营字段与后台配置

**Files:**
- Modify: `src/db/schema/catalog.ts`
- Create: `drizzle/0008_*.sql`
- Modify: `src/features/admin/product-schema.ts`
- Modify: `src/features/admin/product-schema.test.ts`
- Modify: `src/features/admin/product-form.tsx`
- Modify: `src/server/services/admin-product-service.ts`
- Modify: `src/server/repositories/admin-product-repository.ts`

**Interfaces:**
- Produces: `AdminProductInput.compareAtPriceCents?: number`, `isFeatured: boolean`, `featuredSort: number`, `promotionLabel?: string`。
- Produces: `products.compareAtPriceCents`, `products.isFeatured`, `products.featuredSort`, `products.promotionLabel`。

- [ ] **Step 1: 写运营字段解析失败测试**

```ts
test("商品运营字段拒绝低于现价的划线价和负排序", () => {
  const formData = validProductFormData();
  formData.set("compareAtPriceYuan", "99");
  formData.set("priceYuan", "199");
  formData.set("featuredSort", "-1");
  const result = parseAdminProductFormData(formData);
  assert.equal(result.success, false);
});

test("空划线价和空促销标签被归一化", () => {
  const formData = validProductFormData();
  formData.set("compareAtPriceYuan", "");
  formData.set("promotionLabel", "");
  const result = parseAdminProductFormData(formData);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.compareAtPriceCents, undefined);
    assert.equal(result.data.promotionLabel, undefined);
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx.cmd tsx --test src/features/admin/product-schema.test.ts`

Expected: FAIL，因为表单解析尚未返回运营字段或缺少测试辅助函数。

- [ ] **Step 3: 扩展 schema 与表单解析**

```ts
const adminProductFormSchema = z.object({
  // 保留现有字段
  compareAtPriceYuan: optionalText(20, "商品原价格式不正确"),
  isFeatured: z.boolean(),
  featuredSort: z.coerce.number().int().min(0).max(9999),
  promotionLabel: optionalText(30, "促销标签不能超过 30 个字符"),
}).superRefine((value, context) => {
  const price = yuanToCents(value.priceYuan);
  const compareAt = value.compareAtPriceYuan
    ? yuanToCents(value.compareAtPriceYuan)
    : undefined;
  if (compareAt !== undefined && price !== null && compareAt <= price) {
    context.addIssue({ code: "custom", path: ["compareAtPriceYuan"], message: "商品原价必须高于当前价格" });
  }
});
```

数据库字段使用 `int unsigned nullable`、`boolean default false`、`int unsigned default 0` 和 `varchar(30) nullable`；增加 `(status, is_featured, featured_sort)` 索引。表单 checkbox 通过 `formData.get("isFeatured") === "on"` 转成布尔值。

- [ ] **Step 4: 扩展后台 repository 的 selection/create/update**

确保 `selection`、`normalize`、`create()` 与 `update()` 使用同一组字段名。创建和更新时将两个可选字段分别保存为 `null`，继续沿用现有 `version` 乐观锁。

- [ ] **Step 5: 增加后台表单控件**

在价格字段旁加入“商品原价（元）”，并增加“首页推荐”checkbox、“推荐顺序”和“促销标签”。错误信息使用现有 `ErrorText`，编辑态使用数据库默认值回填。

- [ ] **Step 6: 生成并检查迁移**

Run: `npm.cmd run db:generate`

Expected: 新迁移仅新增四个字段和推荐索引，不删除或重建现有业务表。

- [ ] **Step 7: 运行聚焦测试与类型检查**

Run: `npx.cmd tsx --test src/features/admin/product-schema.test.ts`

Run: `npm.cmd run typecheck`

Expected: PASS。

- [ ] **Step 8: 提交后台运营字段**

```powershell
git add -- src/db/schema/catalog.ts drizzle src/features/admin/product-schema.ts src/features/admin/product-schema.test.ts src/features/admin/product-form.tsx src/server/services/admin-product-service.ts src/server/repositories/admin-product-repository.ts
git commit -m "feat: add product merchandising fields"
```

---

### Task 2: 首页查询与业务 DTO

**Files:**
- Modify: `src/server/services/catalog-service.ts`
- Modify: `src/server/repositories/catalog-repository.ts`
- Create: `src/server/services/homepage-service.ts`
- Create: `src/server/services/homepage-service.test.ts`
- Create: `src/server/repositories/homepage-repository.ts`
- Create: `src/server/homepage.ts`

**Interfaces:**
- Produces: `HomepageProductDto`，包含 `defaultVariantId`, `activeVariantCount`, `compareAtPriceCents`, `promotionLabel`, `salesCount`, `memberPriceCents`。
- Produces: `HomepageData`，包含 `featuredProducts`, `newProducts`, `bestSellingProducts`。
- Consumes: `MembershipLevel` 与 `calculateMemberPrice()`。

- [ ] **Step 1: 写首页服务组合测试**

```ts
test("首页商品按当前会员等级计算参考价", async () => {
  const service = createHomepageService(repositoryWithProduct({ priceCents: 10_000 }));
  const result = await service.getHomepageData(2);
  assert.equal(result.featuredProducts[0]?.memberPriceCents, 9_500);
});

test("无推荐商品时推荐区返回空数组且其他区域保留", async () => {
  const service = createHomepageService(repositoryWithEmptyFeatured());
  const result = await service.getHomepageData(0);
  assert.deepEqual(result.featuredProducts, []);
  assert.equal(result.newProducts.length, 1);
});

test("无效划线价不进入公开 DTO", async () => {
  const service = createHomepageService(repositoryWithProduct({ priceCents: 10_000, compareAtPriceCents: 9_000 }));
  const result = await service.getHomepageData(0);
  assert.equal(result.featuredProducts[0]?.compareAtPriceCents, null);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx.cmd tsx --test src/server/services/homepage-service.test.ts`

Expected: FAIL，因为首页服务尚不存在。

- [ ] **Step 3: 定义 repository 与 DTO**

```ts
export type HomepageProductRecord = ProductRecord & {
  compareAtPriceCents: number | null;
  promotionLabel: string | null;
  salesCount: number;
};

export interface HomepageRepository {
  listFeatured(limit: number): Promise<HomepageProductRecord[]>;
  listNewest(limit: number): Promise<HomepageProductRecord[]>;
  listBestSelling(limit: number): Promise<HomepageProductRecord[]>;
}
```

`createHomepageService(repository).getHomepageData(level)` 对三个查询使用 `Promise.all`，每组限制 6 条；统一清理划线价、选择默认 SKU，并使用 `calculateMemberPrice` 计算会员参考价。

- [ ] **Step 4: 实现有限数据库查询**

推荐按 `featuredSort ASC, createdAt DESC, id DESC`；新品按 `createdAt DESC, id DESC`；热销将 `orders`、`orderItems` 与公开商品连接，条件为 `payments.status = SUCCESS` 且 `orders.status NOT IN (REFUNDED, CANCELLED, CLOSED)`，按 `SUM(orderItems.quantity) DESC` 排序。每条查询都必须在 SQL 层 `LIMIT 6`。

- [ ] **Step 5: 扩展 catalog DTO**

公共商品列表继续保持每页 9 条，但附带运营字段、默认 SKU id、有效 SKU 数和 `salesCount`，供通用商品卡片显示与判断快速加购。详情 DTO 保留完整 SKU 数组。

- [ ] **Step 6: 运行服务测试和类型检查**

Run: `npx.cmd tsx --test src/server/services/homepage-service.test.ts src/server/services/catalog-service.test.ts`

Run: `npm.cmd run typecheck`

Expected: PASS。

- [ ] **Step 7: 提交首页数据层**

```powershell
git add -- src/server/services/catalog-service.ts src/server/repositories/catalog-repository.ts src/server/services/homepage-service.ts src/server/services/homepage-service.test.ts src/server/repositories/homepage-repository.ts src/server/homepage.ts
git commit -m "feat: add homepage merchandising queries"
```

---

### Task 3: 商品卡片与真实快速加购

**Files:**
- Create: `src/features/catalog/quick-purchase.tsx`
- Modify: `src/features/catalog/product-card.tsx`
- Modify: `src/features/catalog/catalog-filters.tsx`
- Modify: `src/app/actions/cart.ts`

**Interfaces:**
- Consumes: `defaultVariantId: number | null`, `activeVariantCount: number`, `stock: number`。
- Consumes: `addToCartAction(previousState, formData)`。
- Produces: `<ProductCard product memberLevel? compact? />`。

- [ ] **Step 1: 使加购 action 同时刷新首页导航数据**

成功后保留 `revalidatePath("/cart")` 并增加 `revalidatePath("/")`。未登录时仍使用 `safeNextPath` 生成 `/login?next=...`，不允许外部 URL。

- [ ] **Step 2: 实现快速购买组件**

```tsx
export function QuickPurchase({ product }: { product: ProductCardDto }) {
  if (product.activeVariantCount !== 1 || !product.defaultVariantId) {
    return <Link href={`/products/${product.slug}`}>选择规格</Link>;
  }
  return (
    <AddToCartButton
      variantId={product.defaultVariantId}
      returnTo="/"
      disabled={product.stock <= 0}
      compact
    />
  );
}
```

扩展 `AddToCartButton` 的可选 `compact` 和 `className` 外观，不改变详情页默认的全宽按钮。

- [ ] **Step 3: 升级商品卡片信息层级**

卡片显示促销标签、分类、名称、摘要、当前价、有效划线价、销量、库存状态和快捷操作。会员等级大于 0 时显示由服务端传入的会员参考价。商品主链接与按钮不能形成嵌套交互元素。

- [ ] **Step 4: 调整商品筛选锚点**

筛选表单提交到 `/#catalog`，分类链接和分页链接保留查询参数并追加 `#catalog`。商品总览容器设置 `id="catalog"` 与合适的 `scroll-mt-*`。

- [ ] **Step 5: 执行类型检查与 lint**

Run: `npm.cmd run typecheck`

Run: `npm.cmd run lint -- src/features/catalog src/app/actions/cart.ts`

Expected: PASS，且没有交互元素嵌套或 hooks 依赖警告。

- [ ] **Step 6: 提交商品成交交互**

```powershell
git add -- src/features/catalog src/app/actions/cart.ts
git commit -m "feat: add homepage quick purchase cards"
```

---

### Task 4: 暖白轻奢首页组件与响应式布局

**Files:**
- Create: `src/features/home/home-hero.tsx`
- Create: `src/features/home/category-shortcuts.tsx`
- Create: `src/features/home/commerce-highlights.tsx`
- Create: `src/features/home/product-showcase.tsx`
- Create: `src/features/home/membership-panel.tsx`
- Create: `src/features/home/service-promises.tsx`
- Create: `src/features/home/site-footer.tsx`
- Modify: `src/features/site/site-header.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/error.tsx`

**Interfaces:**
- Consumes: `HomepageData`, `CategoryDto[]`, `ProductListDto`, `MembershipLevel`, `lifetimePaidCents`。
- Produces: 完整首页 Server Component；快速加购仍由 Task 3 的客户端叶子组件负责。

- [ ] **Step 1: 阅读仓库内 Next.js 16 文档**

Run: `Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`

Run: `Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`

Run: `Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`

Run: `Get-Content -Raw node_modules/next/dist/docs/01-app/02-guides/forms.md`

Expected: 页面、Link、Image、form 和 Server Action 写法符合当前安装版本。

- [ ] **Step 2: 实现首屏和分类快捷入口**

首屏包含精确中文文案“科技，让日常多一点喜欢”、搜索框、“立即选购”和“查看新品”。主视觉复用已配置允许域名中的一张真实科技商品图，并通过 `Image` 设置 `priority`；分类卡片使用数据库名称和数量，不硬编码不存在的分类。

- [ ] **Step 3: 实现运营商品区**

`ProductShowcase` 接收标题、说明、锚点和商品数组；数组为空时返回 `null`。首页分别传入推荐、新品与热销数据，热销卡片显示真实销量。

- [ ] **Step 4: 实现会员区**

未登录时展示 8,000 元 / 9.8 折、80,000 元 / 9.5 折、800,000 元 / 9 折和登录入口。登录后使用 `membershipTiers` 计算下一等级差额与百分比，满级显示“已解锁最高等级”。

- [ ] **Step 5: 实现服务区、页脚和导航**

顶部公告包含“全场包邮”“订单保留 2 小时”“心悦会员最高 9 折”。导航在窄屏允许横向滚动或收敛次要入口，不能出现页面横向溢出。根布局移除旧的单行 footer，替换为 `SiteFooter`。

- [ ] **Step 6: 装配首页并行数据**

```ts
const [categories, products, homepageData, session] = await Promise.all([
  catalogService.listCategories(),
  catalogService.listProducts(query),
  homepageService.getHomepageData(membershipLevel),
  getCurrentSession(),
]);
```

实际代码先获取 session 以确定等级，再与不依赖会话的查询尽量并行；不得为了展示会员价在客户端重新请求商品数据。首页商品总览保持原有空结果与分页行为。

- [ ] **Step 7: 增加中文错误边界**

`src/app/error.tsx` 使用 Client Component 接收 `reset()`，显示“页面暂时没有加载成功”和“重新加载”按钮；开发环境之外不输出错误对象或数据库信息。

- [ ] **Step 8: 验证页面静态质量**

Run: `npm.cmd run typecheck`

Run: `npm.cmd run lint -- src/app src/features/home src/features/site src/features/catalog`

Expected: PASS。

- [ ] **Step 9: 提交首页视觉重构**

```powershell
git add -- src/app src/features/home src/features/site src/features/catalog
git commit -m "feat: redesign storefront homepage"
```

---

### Task 5: 示例运营数据与最终验收

**Files:**
- Modify: `src/db/seed.ts`
- Modify when needed: files changed by Tasks 1-4

**Interfaces:**
- Consumes: Task 1 的商品运营字段。
- Produces: 本地数据库可重复执行的首页示例数据。

- [ ] **Step 1: 为科技商品增加运营种子数据**

至少设置 6 个 `isFeatured: true` 商品，推荐顺序互不冲突；部分商品设置高于当前默认 SKU 价格的 `compareAtPriceCents` 和不超过 30 字的促销标签。种子继续按 slug 幂等更新，不生成虚假销量。

- [ ] **Step 2: 应用迁移并刷新种子数据**

Run: `npm.cmd run db:migrate`

Run: `npm.cmd run db:seed`

Expected: 两条命令成功；首页推荐区有数据，新品区有数据，热销区只在已有成功订单时显示真实记录。

- [ ] **Step 3: 执行聚焦自动验证**

Run: `npm.cmd test -- --test-name-pattern="首页|商品运营|商品列表|会员"`

Run: `npm.cmd run typecheck`

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: 全部退出码为 0。

- [ ] **Step 4: 浏览器验收**

检查 1440px 桌面、768px 平板和 390px 手机宽度：首页无横向溢出；中文文案可读；搜索、分类、分页锚点正确；单 SKU 加购成功；多 SKU 进入详情；未登录加购跳转登录并能返回；会员区显示与账户一致的等级和进度。

- [ ] **Step 5: 检查工作区和敏感文件**

Run: `git status --short`

Run: `git diff --check`

Expected: 只有本功能预期文件，无 `.env`、数据库文件、上传隐私文件或空白错误。

- [ ] **Step 6: 提交种子与验收修复**

```powershell
git add -- src/db/seed.ts
git add --update
git commit -m "feat: seed homepage merchandising data"
```

---

## Self-Review Result

- Spec coverage: 商品运营字段、真实推荐/新品/热销、会员价格、快速加购、暖白首页、后台配置、降级、响应式与验收均有对应任务。
- Placeholder scan: 无 `TBD`、无未定义的“后续补充”步骤；所有代码任务包含接口、命令或明确实现规则。
- Type consistency: `compareAtPriceCents`、`isFeatured`、`featuredSort`、`promotionLabel`、`HomepageProductDto` 和 `HomepageData` 在任务间命名一致。
