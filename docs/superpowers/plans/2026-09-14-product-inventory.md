# 商品 SKU 与库存升级实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox ("- [ ]") syntax for tracking.

**Goal:** 在现有旧雨电商上增加商品 SKU、多图管理、后台图片上传、库存流水和低库存预警，同时保持旧商品、购物车和历史订单兼容。

**Architecture:** 保持 Next.js 16 模块化单体架构。products 继续作为商品主记录，新增 product_variants 作为最终价格和库存来源；Server Component 读取目录数据，Server Action 处理后台写入，仓储层在 MySQL 事务中完成 SKU 库存和流水变更。图片先通过独立的本地存储适配器写入 public/uploads/products，数据库只保存站内 URL。

**Tech Stack:** Next.js 16.3.5 App Router、React 19.2.8、TypeScript 5.9.3 strict、Tailwind CSS 4.3.3、MySQL 8.4、Drizzle ORM 0.45.2、Zod 4.6.2、Node.js 24。

**Spec:** docs/superpowers/specs/2026-09-14-operations-upgrade-design.md（第 3.1 至 3.3 节）

## Global Constraints

- 页面默认使用 Server Component；表单写入使用 Server Action；上传和公开数据接口使用 Route Handler。
- 所有金额继续使用整数分；价格和库存必须由服务端重新读取，浏览器字段不可信。
- 所有库存变更必须在同一数据库事务中更新 SKU 库存并写入 inventory_transactions。
- 商品、分类和历史订单不得硬删除；商品图片删除只删除图片记录和本地文件，不删除订单快照。
- 后台每个读写入口都必须在服务端调用 requireAdmin/getAdminSession 校验权限。
- UI 文案使用中文；必要的代码注释使用中文；不得把数据库对象原样传给 Client Component。
- 不新增运行时依赖；使用 Node.js 内置 crypto、fs/promises 和现有 Zod/Drizzle 能力。
- .env、数据库连接串、上传目录中的文件和测试账号不得提交到 Git。

## 文件结构与职责

- Modify: src/db/schema/catalog.ts — 商品 SKU、图片主图字段和枚举。
- Modify: src/db/schema/commerce.ts — 购物车/订单项的 SKU 快照字段和库存流水表。
- Modify: src/db/schema/index.ts — 导出新增 Schema。
- Modify: src/db/seed.ts — 为现有三个种子商品创建可重复执行的默认 SKU 和主图。
- Create: src/lib/inventory.ts — 库存预警阈值和库存流水类型。
- Modify: src/server/repositories/catalog-repository.ts — 公开商品读取 SKU、主图和图片列表。
- Modify: src/server/services/catalog-service.ts — 对外 DTO 增加规格和库存信息。
- Modify: src/server/repositories/cart-repository.ts — 购物车改用 variantId，锁定 SKU 库存。
- Modify: src/server/repositories/order-repository.ts — 下单、取消和过期关闭按 SKU 扣减/恢复并写流水。
- Modify: src/features/admin/product-schema.ts、product-form.tsx — SKU 表单输入、价格和库存校验。
- Create: src/features/admin/variant-editor.tsx — 后台 SKU 行编辑器。
- Create: src/features/admin/inventory-adjustment-form.tsx — 后台入库/调整库存表单。
- Create: src/server/repositories/inventory-repository.ts — 库存流水查询和事务写入。
- Create: src/server/services/inventory-service.ts — 库存调整、预警和错误映射。
- Create: src/server/storage/product-image-storage.ts — 本地图片保存、删除和 URL 生成。
- Create: src/server/services/product-image-service.ts — 文件校验与管理员权限编排。
- Create: src/app/api/admin/product-images/route.ts — 图片上传 Route Handler。
- Create: src/app/api/admin/product-images/[id]/route.ts — 图片删除 Route Handler。
- Modify: src/app/admin/(protected)/products/[id]/edit/page.tsx — 商品图片和 SKU 管理面板。
- Modify: src/app/products/[slug]/page.tsx — 商品详情图片画廊、SKU 选择和可售库存。
- Modify: .gitignore — 忽略 public/uploads/。
- Create: src/features/catalog/variant-selection.tsx — 商品详情页 SKU 选择 Client Component。
- Create/Modify tests: 对应 service/repository 测试和 src/server/repositories/product-variant.integration.test.ts。
- Create: drizzle/<generated-migration>.sql — 由 drizzle-kit generate 生成并审查的迁移文件。

---

### Task 1: 扩展 Schema 并生成兼容迁移

**Files:**
- Modify: src/db/schema/catalog.ts
- Modify: src/db/schema/commerce.ts
- Modify: src/db/schema/index.ts
- Modify: src/db/seed.ts
- Modify: .gitignore
- Create: generated file under drizzle/
- Test: src/server/repositories/product-variant.integration.test.ts

**Interfaces:**
- Produces productVariants、inventoryTransactions、variantStatuses 和 inventoryTransactionTypes。
- cartItems.variantId、orderItems.variantId 和订单 SKU 快照字段供后续任务使用。
- 保留 products.priceCents、products.stock 和 orderItems.productId 作为迁移期兼容字段；新业务不再读取旧商品价格/库存列。

- [ ] **Step 1: 写 Schema 失败测试**

在 product-variant.integration.test.ts 中添加数据库测试，断言可以插入默认 SKU、库存流水，并通过 SKU 查询价格和库存。测试使用 RUN_DB_TESTS=1 控制跳过。

~~~ts
const [variant] = await db.insert(schema.productVariants).values({
  productId,
  skuCode: "SKU-" + suffix,
  name: "默认规格",
  attributesJson: JSON.stringify({}),
  priceCents: 1000,
  stock: 5,
  status: "ACTIVE",
}).$returningId();
assert.ok(variant.id);
await db.insert(schema.inventoryTransactions).values({
  variantId: variant.id,
  type: "INITIAL",
  quantityDelta: 5,
  stockBefore: 0,
  stockAfter: 5,
  referenceType: "SEED",
  referenceId: String(variant.id),
});
~~~

- [ ] **Step 2: 运行失败测试**

Run: PowerShell 设置 RUN_DB_TESTS=1 和 NODE_OPTIONS=--conditions=react-server 后执行 npm.cmd exec tsx -- --env-file=.env --test src/server/repositories/product-variant.integration.test.ts。

Expected: FAIL，因为 productVariants 和 inventoryTransactions 尚未导出。

- [ ] **Step 3: 修改 Schema**

在 catalog.ts 中新增 productVariants 表，字段为 id、productId、skuCode、name、attributesJson、priceCents、stock、status、createdAt、updatedAt；skuCode 建立唯一索引，productId/status 建立联合索引。variantStatuses 使用 ACTIVE、ARCHIVED。

在 productImages 增加 isPrimary。commerce.ts 增加 cartItems.variantId、orderItems.variantId、variantName、variantAttributesJson，并新增 inventoryTransactions。系统产生的流水允许 operatorUserId 为空。

- [ ] **Step 4: 生成、补充并执行迁移**

先运行 npm.cmd run db:generate，审查生成 SQL 的结构变更；在该迁移尚未执行前，追加一段可审查、可重复执行的数据回填 SQL，顺序为：创建 SKU/流水表；为没有默认 SKU 的现有商品插入默认 SKU；给购物车和订单项回填默认 SKU；再创建 variant_id 索引和非空约束。回填 SQL 必须使用 INSERT ... SELECT 与 NOT EXISTS，不能依赖当前自增 ID。确认 SQL 后运行 npm.cmd run db:migrate；不得修改已经执行过的迁移文件。

回填规则：每个商品创建 skuCode 为 <product.slug>-default、名称为“默认规格”、规格 JSON 为 {}、价格/库存复制现有商品列；现有购物车和订单项通过 product_id 关联默认 SKU。迁移不得删除历史订单列。

- [ ] **Step 5: 通过测试并提交**

Run: npm.cmd run test:db

Expected: Schema 集成测试通过，临时数据在 finally 中清理，默认商品数量和库存不变。

~~~bash
git add src/db/schema/catalog.ts src/db/schema/commerce.ts src/db/schema/index.ts src/db/seed.ts drizzle .gitignore src/server/repositories/product-variant.integration.test.ts
git commit -m "feat: 增加商品 SKU 与库存流水模型"
~~~

### Task 2: 迁移公开商品查询与 SKU DTO

**Files:**
- Modify: src/server/services/catalog-service.ts
- Modify: src/server/repositories/catalog-repository.ts
- Modify: src/app/api/products/route.ts
- Modify: src/app/api/products/[id]/route.ts
- Modify: src/features/catalog/product-card.tsx
- Modify: src/app/products/[slug]/page.tsx
- Create: src/features/catalog/variant-selection.tsx
- Test: src/server/services/catalog-service.test.ts

**Interfaces:**
- ProductVariantDto = { id: number; skuCode: string; name: string; attributes: Record<string, string>; priceCents: number; stock: number; status: "ACTIVE" | "ARCHIVED" }。
- ProductRecord 增加 variants 和 images；公开列表返回默认可售 SKU 的价格、库存和主图。
- findProductBySlug 和 findProductById 只返回至少存在一个 ACTIVE SKU 的商品；详情页选择默认 SKU。

- [ ] **Step 1: 写 DTO 失败测试**

fake repository 返回两个 SKU 和两张图片，断言详情 DTO 保留排序后的图片和两个 SKU，主图 URL 来自 isPrimary=true 的图片。

~~~ts
assert.deepEqual(detail.variants.map((item) => item.skuCode), ["SKU-B", "SKU-A"]);
assert.equal(detail.images.find((item) => item.isPrimary)?.url, "/uploads/products/main.webp");
~~~

- [ ] **Step 2: 运行失败测试**

Run: npm.cmd exec tsx -- --test src/server/services/catalog-service.test.ts

Expected: FAIL，因为当前 ProductRecord 没有 variants 和 images。

- [ ] **Step 3: 实现仓储查询**

在 catalog-repository.ts 中查询商品主记录，再查询 productVariants 和 productImages，按 isPrimary DESC、sortOrder ASC、id ASC 排序；安全解析 attributesJson，解析失败使用空对象并记录服务端错误。列表价格和库存取第一个 ACTIVE SKU，详情返回全部 SKU。

- [ ] **Step 4: 更新服务和页面**

更新 catalog-service.ts 的列表 DTO，保留现有 API 顶层字段以兼容调用方，增加 defaultVariant 和 images。详情页使用 VariantSelection 选择 SKU，并将选中 variantId 传给购物车表单；匿名用户仍可浏览规格和库存。

- [ ] **Step 5: 通过测试并提交**

Run: npm.cmd test、npm.cmd run typecheck、npm.cmd run lint

Expected: 目录测试、首页、公开 API 和详情页通过。

~~~bash
git add src/server/services/catalog-service.ts src/server/repositories/catalog-repository.ts src/app/api/products src/features/catalog src/app/products
git commit -m "feat: 商品目录支持 SKU 与多图"
~~~

### Task 3: 迁移购物车、下单和订单快照

**Files:**
- Modify: src/server/services/cart-service.ts
- Modify: src/server/repositories/cart-repository.ts
- Modify: src/app/actions/cart.ts
- Modify: src/features/cart/add-to-cart-button.tsx
- Modify: src/features/cart/cart-item-actions.tsx
- Modify: src/server/services/order-service.ts
- Modify: src/server/repositories/order-repository.ts
- Modify: src/app/actions/order.ts
- Modify: src/features/order/checkout-form.tsx
- Modify: src/app/orders/[orderNo]/page.tsx
- Test: src/server/services/cart-service.test.ts
- Test: src/server/repositories/cart-repository.integration.test.ts
- Test: src/server/repositories/transaction-flow.integration.test.ts

**Interfaces:**
- CartRepository.addItem({ userId, variantId, quantity })、updateItem({ userId, cartItemId, quantity })、listItems(userId) 返回 SKU 记录。
- OrderRepository.create 从购物车 variantId 读取价格、库存、规格和主图；订单项返回 variantId、variantName、variantAttributesJson。
- CartItemRecord.product 增加 variantId、variantName、variantAttributes、priceCents、stock。

- [ ] **Step 1: 写失败测试**

扩展购物车集成测试：同一商品的两个 SKU 生成两条购物车记录；隐藏/归档 SKU 返回不可售；同一 SKU 重复添加只累加该 SKU。

扩展交易集成测试：下单扣减 SKU 库存，订单项保存 SKU 名称和规格 JSON；取消与两小时关闭只恢复对应 SKU，并各写一条流水。

- [ ] **Step 2: 运行失败测试**

Run: npm.cmd run test:db

Expected: FAIL，因为仓储仍以 productId 查询和扣减库存。

- [ ] **Step 3: 修改购物车服务与 Action**

将 productId 输入改为正整数 variantId，服务层保留统一中文错误码。AddToCartButton 从详情页接收 variantId；数量更新和删除仍使用购物车项 ID，不允许客户端修改 SKU。

- [ ] **Step 4: 修改下单事务**

createOrderTransaction 查询并锁定 productVariants，按 variantId 条件扣减库存；写入 SALE 流水，stockBefore 和 stockAfter 来自同一事务。取消和过期关闭按订单项 variantId 恢复库存并写 CANCEL_RESTORE 流水。会员价格仍由订单主记录计算，SKU 价格只作为原价来源。

- [ ] **Step 5: 更新订单展示、通过测试并提交**

订单列表、详情和结算页展示 SKU 名称和规格；历史订单没有规格时显示“默认规格”。

Run: npm.cmd run test:db、npm.cmd test、npm.cmd run typecheck

Expected: 购物车、下单、支付、取消和过期恢复测试全部通过。

~~~bash
git add src/server/services/cart-service.ts src/server/repositories/cart-repository.ts src/app/actions/cart.ts src/features/cart src/server/services/order-service.ts src/server/repositories/order-repository.ts src/app/actions/order.ts src/features/order src/app/orders
git commit -m "feat: 购物车订单切换到 SKU 库存"
~~~

### Task 4: 后台 SKU CRUD 与库存调整

**Files:**
- Modify: src/features/admin/product-schema.ts
- Modify: src/features/admin/product-form.tsx
- Create: src/features/admin/variant-editor.tsx
- Create: src/features/admin/inventory-adjustment-form.tsx
- Modify: src/server/repositories/admin-product-repository.ts
- Modify: src/server/services/admin-product-service.ts
- Modify: src/app/actions/admin-product.ts
- Modify: src/app/admin/(protected)/products/[id]/edit/page.tsx
- Modify: src/app/admin/(protected)/products/page.tsx
- Create: src/server/repositories/inventory-repository.ts
- Create: src/server/services/inventory-service.ts
- Test: src/features/admin/admin-schema.test.ts
- Test: src/server/services/inventory-service.test.ts

**Interfaces:**
- AdminVariantInput = { id?: number; skuCode: string; name: string; attributes: Record<string, string>; priceYuan: string; stock: number; status: "ACTIVE" | "ARCHIVED" }。
- adminProductService.updateVariants(admin, { productId, version, variants }) 返回 UPDATED、CONFLICT、NOT_FOUND 或 VALIDATION_ERROR。
- inventoryService.adjustStock(admin, { variantId, quantityDelta, note }) 返回 stockBefore/stockAfter 或权限/库存错误。

- [ ] **Step 1: 写 Schema 与服务失败测试**

覆盖 SKU 编码格式、价格最多两位小数、规格键值长度、库存非负、归档 SKU 不可作为唯一可售 SKU；库存调整覆盖零数量、负数恢复导致库存小于零、非管理员调用和并发版本冲突。

- [ ] **Step 2: 运行失败测试**

Run: npm.cmd test

Expected: 新增测试失败，因为后台服务没有 SKU 和库存调整接口。

- [ ] **Step 3: 实现服务与仓储**

后台更新商品时锁定商品版本，在同一事务中校验至少一个 ACTIVE SKU 和 SKU 编码唯一性；SKU 库存不允许通过普通商品表单直接覆盖，库存变更统一调用 inventoryService.adjustStock 并写 ADJUSTMENT 或 INBOUND 流水。

- [ ] **Step 4: 实现管理界面**

商品编辑页增加可增删的 SKU 行，每行显示编码、规格名称、规格 JSON、价格、库存和状态；库存调整表单要求填写变更数量和备注，提交后刷新 SKU 列表和商品列表。

- [ ] **Step 5: 通过测试并提交**

Run: npm.cmd test、npm.cmd run test:db、npm.cmd run lint、npm.cmd run typecheck

Expected: SKU CRUD、管理员权限、库存调整和版本冲突测试通过。

~~~bash
git add src/features/admin src/server/repositories/admin-product-repository.ts src/server/services/admin-product-service.ts src/server/services/inventory-service.ts src/server/repositories/inventory-repository.ts src/app/actions/admin-product.ts src/app/admin src/server/services/inventory-service.test.ts
git commit -m "feat: 增加后台 SKU 与库存调整"
~~~

### Task 5: 商品图片存储、上传和管理

**Files:**
- Create: src/server/storage/product-image-storage.ts
- Create: src/server/services/product-image-service.ts
- Create: src/app/api/admin/product-images/route.ts
- Create: src/app/api/admin/product-images/[id]/route.ts
- Create: src/features/admin/product-image-manager.tsx
- Modify: src/app/admin/(protected)/products/[id]/edit/page.tsx
- Modify: src/features/catalog/product-visual.tsx
- Modify: src/app/products/[slug]/page.tsx
- Modify: .gitignore
- Test: src/server/services/product-image-service.test.ts

**Interfaces:**
- productImageStorage.save(file: File): Promise<{ path: string; url: string }>。
- productImageService.upload(admin, { productId, file }) 与 remove(admin, { imageId }) 负责权限、文件校验、数据库记录和清理文件。
- 上传 Route Handler 接收 multipart/form-data 的 productId 与 file，返回图片 DTO 或中文错误。

- [ ] **Step 1: 写文件校验失败测试**

使用 File 验证 JPEG、PNG、WebP 小于 5 MB 可通过；SVG、伪造扩展名、空文件和超过 5 MB 返回明确错误；生成文件名不包含用户原始文件名。

- [ ] **Step 2: 运行失败测试**

Run: npm.cmd test

Expected: FAIL，因为图片服务和存储适配器尚未创建。

- [ ] **Step 3: 实现本地存储适配器**

使用 crypto.randomUUID() 生成文件名，按 MIME 映射扩展名，写入 public/uploads/products。目录不存在时递归创建；删除时只接受服务端生成的站内路径，不允许 .. 或绝对路径逃逸。

- [ ] **Step 4: 实现 Route Handler 与后台组件**

Route Handler 内调用 getAdminSession，检查 Content-Type 和表单字段，成功后刷新后台编辑页与商品详情页。后台组件显示主图标记，提供设为主图、排序和删除操作。

- [ ] **Step 5: 更新详情画廊、测试并提交**

详情页显示主图和缩略图，图片缺失时保留占位视觉；将 public/uploads/ 加入 .gitignore。

Run: npm.cmd test、npm.cmd run lint、npm.cmd run typecheck、npm.cmd run build

Expected: 文件校验、上传权限、详情画廊和生产构建通过。

~~~bash
git add src/server/storage src/server/services/product-image-service.ts src/app/api/admin/product-images src/features/admin/product-image-manager.tsx src/app/admin src/features/catalog/product-visual.tsx src/app/products .gitignore
git commit -m "feat: 增加商品图片上传与多图管理"
~~~

### Task 6: 库存预警与后台运营展示

**Files:**
- Create: src/lib/inventory.ts
- Modify: src/server/services/inventory-service.ts
- Modify: src/server/repositories/inventory-repository.ts
- Modify: src/server/repositories/admin-product-repository.ts
- Modify: src/app/admin/(protected)/products/page.tsx
- Modify: src/app/admin/(protected)/page.tsx
- Create: src/features/admin/low-stock-badge.tsx
- Test: src/server/services/inventory-service.test.ts

**Interfaces:**
- LOW_STOCK_THRESHOLD = 10。
- inventoryService.listLowStock(admin) 返回 variantId、productId、productName、skuCode、stock。
- inventoryService.isLowStock(stock: number): boolean 返回 stock <= LOW_STOCK_THRESHOLD。

- [ ] **Step 1: 写预警测试**

断言库存 10、1、0 为低库存，库存 11 不是；未登录或普通用户不能读取低库存列表；列表按库存升序再按更新时间排序。

- [ ] **Step 2: 运行失败测试**

Run: npm.cmd test

Expected: FAIL，因为库存阈值和查询尚未实现。

- [ ] **Step 3: 实现查询与 UI**

仓储层联结商品、分类和 SKU，只返回管理员可见 SKU；后台商品表格显示“库存紧张”标签，概览卡片显示低库存 SKU 数量。所有查询通过服务层权限检查。

- [ ] **Step 4: 回归测试**

Run: npm.cmd test、npm.cmd run test:db、npm.cmd run lint、npm.cmd run typecheck、npm.cmd run build

Expected: 全部通过，首页公开商品数据仍按在售 SKU 的实时状态展示，后台低库存数量与数据库一致。

- [ ] **Step 5: 提交一期完成版本**

~~~bash
git add src/lib/inventory.ts src/server/services/inventory-service.ts src/server/repositories/inventory-repository.ts src/server/repositories/admin-product-repository.ts src/app/admin src/features/admin/low-stock-badge.tsx src/server/services/inventory-service.test.ts
git commit -m "feat: 增加库存预警与运营展示"
~~~

## 完成标准

- 每个商品至少有一个默认 ACTIVE SKU，现有种子商品和历史订单经过迁移后仍可访问。
- 首页、商品详情、购物车、结算和订单均使用 SKU 的实时价格与库存。
- 下单、取消、超时关闭、后台入库和库存调整都会生成可追踪库存流水。
- 后台可创建、编辑、归档 SKU，上传和管理商品图片，并看到低库存预警。
- 图片上传不允许 SVG、路径逃逸或超过 5 MB 的文件，上传目录被 Git 忽略。
- npm test、npm run test:db、npm run lint、npm run typecheck 和 npm run build 全部通过。
- 本计划完成后，再为第二期物流与售后、第三期用户安全与运营分别建立独立计划，避免跨期迁移和状态规则混杂。
