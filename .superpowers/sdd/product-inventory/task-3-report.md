# Task 3 报告 — 购物车、下单和订单快照切换到 SKU

## 修改文件

- `src/server/services/cart-service.ts`、`cart-service.test.ts`：公开加入购物车输入改为正整数 `variantId`；购物车 DTO 增加 SKU 名称、属性、价格、库存和状态；合计只统计可售且库存充足的 SKU。
- `src/server/repositories/cart-repository.ts`、`cart-repository.integration.test.ts`：新增/累加按 `userId + variantId` 定位；库存与可售状态读取 `product_variants`；覆盖同商品双 SKU、归档 SKU、隐藏分类、所有权和重复累加。
- `src/app/actions/cart.ts`、`src/features/cart/add-to-cart-button.tsx`、`src/app/cart/page.tsx`：Server Action 继续鉴权并以 Zod 校验 `variantId`；客户端只提交 SKU 标识和数量；购物车展示 SKU 规格。
- `src/server/services/order-service.ts`、`src/server/repositories/order-repository.ts`：订单读取 SKU 原价；事务锁定 SKU，条件扣减库存；保存 `variantId`、SKU 名称和属性 JSON 快照；写入 `SALE` 流水；取消和批量/用户过期关闭恢复对应 SKU 并写 `CANCEL_RESTORE`。
- `src/server/repositories/payment-repository.ts`：支付查询/确认触发的过期关闭同步改为恢复 SKU 并写 `CANCEL_RESTORE`，避免绕过订单仓储时回退到商品主库存。
- `src/features/order/checkout-form.tsx`、`src/app/orders/page.tsx`、`src/app/orders/[orderNo]/page.tsx`、`src/features/order/presentation.ts`、`presentation.test.ts`：结算、订单列表和详情展示 SKU 快照；空或无效历史规格统一显示“默认规格”。
- `src/server/repositories/transaction-flow.integration.test.ts`：覆盖 SKU 价格作为原价、主商品旧价格/库存不被使用、SKU 快照、SALE、取消恢复、支付入口过期恢复和幂等。
- `src/server/repositories/catalog-repository.ts`、`src/server/catalog.ts`、`src/app/products/[slug]/page.tsx`：在完整 SKU 选择器落地前，详情页从服务端读取首个在售 SKU，并将其真实 `variantId` 传入购物车按钮；价格和库存同步显示该 SKU 的值。

## 接口变化

- `CartRepository.addItem({ userId, variantId, quantity })` 替代 `productId` 输入。
- `cartService.addItem({ userId, variantId, quantity })` 替代 `productId` 输入，并额外验证 `variantId` 为正安全整数。
- `AddToCartButton` 的公开属性和隐藏表单字段由 `productId` 改为 `variantId`。
- `CartItemRecord.product` 增加 `variantId`、`variantName`、`variantAttributes`、`variantStatus`；`priceCents`、`stock` 语义切换为 SKU 值。
- `OrderRecord.items` 增加 `variantId`、`variantName`、`variantAttributesJson`。
- 库存流水以 `referenceType = ORDER`、`referenceId = orderNo` 关联订单。

## 验证

- `npm.cmd run test:db`：3/3 通过，0 失败。
- `npm.cmd test`：47 项；44 通过，3 个数据库用例按普通测试配置跳过，0 失败。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run build`：Next.js 生产构建通过，20/20 静态页面生成完成。
- `npm.cmd run lint`：通过。

## Concerns

- Task 2 尚未实现完整前台 SKU 选择器；当前商品详情页临时选择首个在售 SKU，保证不会把商品 ID 冒充 SKU ID，也不会信任客户端价格/库存。后续 Task 2 应以用户选择的 SKU 替换该默认选择行为。
- 为保证所有超时入口库存语义一致，本任务额外修改了 `payment-repository.ts`；否则支付页触发过期时仍会恢复旧 `products.stock`。
- 后台订单 DTO/UI 尚未增加 SKU 展示，属于本任务明确排除的后台 SKU UI 范围；用户订单与结算页面已展示规格快照。
