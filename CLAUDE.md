@AGENTS.md

# 旧雨电商项目指南

## 项目简介

旧雨电商是一个采用 Next.js 模块化单体架构的微型 B2C 电商项目。应用由一个 Next.js 服务承担页面渲染、业务逻辑和数据访问，MySQL 保存用户、商品、购物车、订单、支付和会员数据。

项目计划实现：

- 商品浏览：列表、详情、搜索和分类筛选
- 用户注册、登录和退出
- 登录用户购物车
- 下单、订单管理和模拟支付
- 心悦会员等级、消费累计及会员折扣
- 管理后台：商品 CRUD、分类管理和订单管理

## 当前状态

- Next.js 基础工程已创建，首页与商品详情页可正常构建。
- Drizzle ORM 与 MySQL 数据层已接入，地址簿、SKU、库存、物流、售后、用户状态、限流、审计及互动数据迁移已生成，共包含 22 张表。
- 已提供分类和商品种子数据，首页支持真实商品搜索、分类筛选和每页 9 条分页。
- 已提供商品列表、商品详情和分类公开 API。
- 已接入 Better Auth 邮箱密码认证与数据库 Session。
- 登录用户可以把商品真实写入购物车，并在购物车页查看、修改和删除已选商品。
- 已完成地址簿、会员折扣、结算、原子下单、两小时订单过期、取消订单与库存恢复。
- 已完成幂等模拟支付、累计实付更新、心悦会员升级和支付结果展示；支付适配器支持微信 Native 扫码支付、签名回调解密及主动查询。
- 已完成管理员权限、后台概览、商品 CRUD（归档代替删除）、分类管理和订单履约管理。
- 已完成物流状态流转、收货确认、售后申请/审核/模拟退款及退款库存恢复。
- 已完成用户与会员后台、冻结交易拦截、修改密码、忘记密码、登录/重置限流和管理员操作审计。
- 已完成订单管理员备注、组合筛选、UTF-8 CSV 导出和上海时区运营看板。
- 已完成高级商品筛选排序、商品收藏、最近浏览、已购评价和同类商品推荐；评价提交后直接公开展示，后台保留历史评价管理入口。
- 已开始统一验收：单元测试、类型检查、ESLint 和生产构建已通过；MySQL 集成测试需在 Docker 引擎启动且执行最新迁移后运行。

## 技术栈

以 `package.json` 和 `package-lock.json` 为最终版本依据：

- Node.js 24
- Next.js 16.3.5，App Router 和 Turbopack
- React / React DOM 19.2.8
- TypeScript 5.9.3，严格模式
- Tailwind CSS 4.3.3
- MySQL 8.4 LTS 作为目标数据库
- Drizzle ORM 0.45.2
- Drizzle Kit 0.31.10
- mysql2 3.24.4
- Zod 4.6.2
- npm 作为包管理器

## 常用命令

```bash
npm install
npm run dev
npm test
npm run test:db
npm run lint
npm run typecheck
npm run build

npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:studio
```

`db:push` 仅限早期本地试验。可追踪的数据库结构变更必须通过 `db:generate` 生成迁移，再使用 `db:migrate` 执行。

## 环境变量与数据库

复制 `.env.example` 为 `.env`，不要提交真实 `.env`：

```env
DATABASE_URL=mysql://user:password@127.0.0.1:3306/old_rain_mall
ORDER_EXPIRATION_JOB_SECRET=replace_with_at_least_32_random_characters
```

仓库提供 `compose.yaml`，安装 Docker 后可启动目标版本的 MySQL：

```bash
docker compose up -d mysql
npm run db:migrate
npm run db:seed
```

不要重置、绕过或猜测现有 MySQL 实例的账号密码。连接外部或已有数据库前，先确认连接串和目标数据库。

## 目录职责

```text
src/
├── app/                 Next.js 路由、布局和页面组装
├── components/          可复用 UI 组件（后续建立）
├── features/            按业务功能组织的表单、Action 和组件（后续建立）
├── server/              服务层、数据访问层和鉴权逻辑（后续建立）
├── db/
│   ├── client.ts        MySQL 连接池与 Drizzle 客户端
│   ├── index.ts         仅服务端使用的数据库出口
│   ├── schema/          Drizzle 表结构
│   └── seed.ts          可重复执行的初始数据
└── lib/                 环境校验、会员规则等无状态工具

drizzle/                 生成后的 SQL 迁移和元数据
compose.yaml             本地 MySQL 8.4 配置
drizzle.config.ts        Drizzle Kit 配置
```

代码分层规则：

- `app` 负责路由和页面组装，不承载复杂业务规则。
- `features` 按商品、购物车、订单和后台等功能组织界面交互。
- `server/services` 实现下单、支付、库存和会员升级等业务事务。
- `server/repositories` 封装可复用数据库查询。
- 页面和组件不得绕过服务层复制关键业务规则。
- 数据库连接、密钥和服务端实现不得导入 Client Component。

## Next.js 开发约束

- 写 Next.js 代码前，先阅读 `AGENTS.md`，再阅读 `node_modules/next/dist/docs/` 中与本次修改相关的 Next.js 16 文档。
- 默认使用 Server Components。仅状态交互、浏览器 API 或事件处理需要 Client Components。
- Server Component 可以通过服务层读取数据库，不为内部页面读取重复建立 REST API。
- 页面表单写操作优先使用 Server Actions。
- Route Handlers 仅用于认证、模拟支付回调、定时任务或未来的外部 API。
- `params` 和 `searchParams` 在 Next.js 16 中是 Promise，使用前必须 `await`。
- 使用 `proxy.ts`，不要新建已弃用的 `middleware.ts`。
- 每个 Server Action 和 Route Handler 都要视为公开入口，内部必须重新鉴权和校验参数。
- 数据写入后根据影响范围使用 `revalidatePath` 或缓存标签刷新页面。

## 数据模型

### 用户与认证

- `users`：用户资料、角色、会员等级和累计实付金额
- `users.status`：`ACTIVE` 或 `FROZEN`；冻结用户可登录和读取历史数据，但不能发起新的交易写入
- `sessions`：登录会话
- `accounts`：密码或第三方账号信息
- `verifications`：验证记录
- `rate_limits`：Better Auth IP 限流和账号摘要限流记录
- `audit_logs`：管理员写操作审计

角色只有 `USER` 和 `ADMIN`。后台权限必须在服务端校验，隐藏按钮不能代替鉴权。

### 商品

- `categories`：一级商品分类
- `products`：商品、价格、库存和上下架状态
- `product_images`：商品图片
- `product_variants`：商品 SKU、规格、价格和实时库存
- `inventory_transactions`：库存调整、销售、取消恢复和退款恢复流水

商品状态为 `DRAFT`、`ACTIVE` 或 `ARCHIVED`。历史订单关联的商品不得硬删除，应改为归档状态。

### 购物车与订单

- `cart_items`：登录用户的购物车商品
- `orders`：订单状态、收货快照、会员折扣快照和实付金额
- `order_items`：商品名称、图片、单价和数量快照
- `payments`：支付记录（支持 MOCK 与 WECHAT_NATIVE）
- `membership_level_logs`：会员升级审计流水
- `shipments`：物流公司、单号及运输状态
- `after_sales`：售后申请、审核、退款及处理状态

订单状态：

```text
PENDING_PAYMENT -> PAID -> SHIPPED -> IN_TRANSIT -> DELIVERED -> COMPLETED
        |           |
        +-----------+----> CANCELLED

PENDING_PAYMENT 超时后可进入 CLOSED
```

## 金额与库存规则

- 所有金额在数据库和 TypeScript 中统一使用整数分，禁止使用浮点元表示金额。
- 商品价格、会员等级、折扣率和订单总额必须由服务端重新读取并计算。
- 浏览器提交的金额、角色、会员等级和折扣均不可信。
- `order_items` 必须保存下单时的商品快照。
- `orders` 必须保存下单时的会员等级、折扣率、原价、优惠和实付快照。
- 创建订单、校验库存、条件扣减库存、写订单项和清空购物车必须位于同一数据库事务。
- 取消或关闭未支付订单时，恢复库存和修改订单状态必须位于同一事务。
- 模拟支付必须幂等，同一订单不能重复累计消费金额。

## 心悦会员规则

会员以成功支付订单的累计实付金额升级：

| 等级 | 累计实付门槛 | 后续订单折扣 | 折扣基点 |
| --- | ---: | ---: | ---: |
| 普通会员 | ¥0 | 原价 | 10000 |
| 心悦1级 | ¥8,000 | 9.8 折 | 9800 |
| 心悦2级 | ¥80,000 | 9.5 折 | 9500 |
| 心悦3级 | ¥800,000 | 9 折 | 9000 |

具体规则：

- 金额门槛分别为 `800000`、`8000000` 和 `80000000` 分。
- 会员升级只在支付成功后发生，创建未支付订单不累计消费。
- 达到升级门槛的当前订单使用支付前等级，升级后的折扣从下一笔订单开始生效。
- 一笔大额订单可以直接跨越多个等级，应升级到符合条件的最高等级。
- 支付成功时，在同一事务内更新支付、订单、用户累计金额、会员等级和升级流水。
- 已取消、已关闭及支付失败的订单不计入累计实付金额。
- 规则常量和计算函数集中维护在 `src/lib/membership.ts`，不得在页面中重复硬编码。

## 认证与数据安全

- 认证使用 Better Auth、MySQL 和数据库 Session，不手写低层密码与 Session 协议。
- 普通商城允许匿名浏览；购物车、结算和订单要求登录。
- 用户只能读取和操作自己的购物车与订单。
- `/admin/**` 和所有后台写操作只允许 `ADMIN`。
- 所有服务端输入使用 Zod 校验。
- 登录错误使用统一提示，不泄露邮箱是否存在。
- 不把数据库对象原样传给客户端，只返回页面需要的 DTO 字段。
- 不提交 `.env`、密码、Token、Cookie 或生产连接串。

## 计划路由

```text
/                         商城首页
/products                 商品列表、搜索和分类筛选
/products/[slug]          商品详情
/login                    登录
/register                 注册
/cart                     购物车
/checkout                 确认订单
/orders                   当前用户订单
/orders/[orderNo]         订单详情和模拟支付
/admin                    后台概览
/admin/products           商品管理
/admin/products/new       新增商品
/admin/products/[id]/edit 编辑商品
/admin/categories         分类管理
/admin/orders             订单管理
/admin/orders/[orderNo]   后台订单详情与履约操作
/admin/users               用户与会员管理
/admin/users/[id]          用户详情、会员流水和冻结/解冻
/admin/audit-logs          管理员操作审计
/admin/reviews             商品评价审核
/account/password          修改密码
/account/favorites         我的收藏
/account/history           最近浏览
/forgot-password           申请密码重置
/reset-password            使用一次性令牌重置密码
/api/auth/[...all]        认证接口
/api/products             公开商品列表接口
/api/products/[id]        公开商品详情接口
/api/categories           公开分类接口
/api/admin/orders/export  管理员按当前筛选导出 CSV
/api/payments/mock        模拟支付接口
/api/payments/wechat/notify 微信支付 Native 回调
/api/jobs/expire-orders   关闭超时订单
```

## 支付与部署约定

- `PAYMENT_PROVIDER=MOCK` 仅用于本地演示；生产微信支付设置为 `WECHAT_NATIVE`。
- 微信支付私钥、平台证书、API v3 密钥和商户号只通过环境变量注入，不得进入客户端 bundle 或 Git。
- Native 下单只创建待支付支付单，不会提前确认订单；支付成功以验签后的微信回调或服务端主动查询为准，确认逻辑复用同一幂等事务。
- 微信回调必须使用公网 HTTPS 地址，并配置为 `WECHAT_NOTIFY_URL`。
- Next.js 使用 standalone 输出；商品图片上传统一由 Sharp 转换为 WebP，运行时挂载 `/app/public/uploads/products` 持久化卷。

## 后续实现顺序

1. 配置可用 MySQL，执行迁移和种子数据。
2. 接入注册登录、数据库 Session 和用户角色权限。
3. 实现商品查询、搜索、分类筛选和详情。
4. 实现登录用户购物车。
5. 已实现下单事务、订单查询、取消和模拟支付。
6. 已实现心悦会员升级与折扣展示。
7. 已实现商品、分类和订单后台管理。
8. 已补齐核心单元测试、MySQL 交易集成测试，并完成浏览器主流程验收；后续可继续扩展自动化端到端测试。

## 修改与验证要求

- 修改前检查现有代码、迁移和未提交改动，保留与任务无关的用户修改。
- 修改表结构时更新 Drizzle Schema，并运行 `npm run db:generate`；不要手写或覆盖已应用迁移。
- 种子脚本必须可重复执行，不产生重复分类和商品。
- 业务功能优先测试金额、库存、权限、状态转换和支付幂等逻辑。
- 完成代码修改后至少运行：

```bash
npm run lint
npm run typecheck
npm run build
```

- 涉及数据库时还要验证迁移可以生成，并在明确的测试数据库上执行集成测试。
- 不要声称数据库迁移、支付或认证已经可用，除非实际运行并验证成功。
