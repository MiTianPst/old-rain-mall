# 公开商品、认证与购物车设计

## 目标

为旧雨电商交付可直接使用的公开商品浏览链路，并补齐邮箱密码认证与登录用户购物车写入，使用户能够搜索、筛选、分页浏览商品，查看详情，注册或登录后把商品加入自己的购物车。

## 范围

- `GET /api/products`：支持 `search`、分类 slug `category` 与 `page`，每页固定 9 条。
- `GET /api/products/[id]`：按数字 ID 返回商品详情及分类。
- `GET /api/categories`：返回公开分类及各分类的在售商品数量。
- 首页 `/`：商品网格、搜索、分类标签与分页。
- 商品详情 `/products/[slug]`：大图、名称、价格、描述、库存与真实加入购物车。
- `/register`、`/login`：邮箱密码认证。
- `/cart`：展示当前登录用户已写入的购物车内容，作为写入结果的可见闭环。

不在本次范围内：购物车删除/改数量、结算、订单、模拟支付、后台 CRUD。

## 技术与约束

- Next.js `16.3.5`、React `19.2.8`、TypeScript 严格模式、Tailwind CSS 4、Drizzle ORM `0.45.2`、MySQL。
- 认证使用 Better Auth `1.7.4`，启用邮箱密码与数据库 Session。
- 所有 UI 文案使用中文；金额在服务端保持整数分，只在展示层格式化为人民币。
- 默认使用 Server Component。商品和购物车读取由 Server Component 直接调用服务层，不请求本项目自己的 HTTP API。
- 搜索表单、分类和分页使用 URL 查询参数，页面可刷新、可分享、可前进后退。
- 只有登录表单和加入购物车按钮等事件交互使用 Client Component。
- Route Handler、Server Action 均视为公开入口，使用 Zod 校验输入并在服务端重新鉴权。

## 分层

```text
app 页面/Route Handler/Server Action
  -> server/services 业务与 DTO
    -> server/repositories Drizzle 查询
      -> MySQL
```

公开 API 与 Server Component 复用同一服务层。API 负责解析 HTTP 输入与映射 400/404；页面负责组合 UI 与 `notFound()`，不复制查询规则。

## 商品查询契约

列表仅包含 `products.status = ACTIVE` 且所属分类为 `ACTIVE` 的商品。`search` 去除首尾空格后，对商品名称、摘要和描述进行 `%关键词%` 模糊搜索；`category` 按分类 slug 精确筛选；`page` 必须为大于零的整数，缺省为 1。结果按创建时间和 ID 倒序，固定每页 9 条。

列表响应：

```ts
type ProductListResponse = {
  data: ProductCardDto[];
  pagination: { page: number; pageSize: 9; total: number; totalPages: number };
  filters: { search: string; category: string };
};
```

非法查询参数返回 400 与中文错误；超出末页返回空数组和真实分页元数据。详情 ID 非正整数返回 400，不存在、未上架或分类隐藏返回 404。分类列表使用左连接，因此没有在售商品的公开分类也会返回，`productCount` 为 0。

## 页面交互

首页并行读取分类与商品。搜索提交 GET 请求并保留当前分类、重置页码；分类标签保留搜索词并重置页码；分页保留搜索与分类。商品卡片链接 `/products/[slug]`。

详情页按 slug 查在售商品，缺失时调用 `notFound()`。优先显示 `coverUrl`，没有图片时显示稳定的中文占位视觉。库存为 0 时禁用按钮。

## 认证设计

Better Auth 通过 Drizzle MySQL adapter 使用现有复数表名，并显式映射 `users`、`sessions`、`accounts`、`verifications`。启用 email/password；密码哈希、Session token 与 Cookie 由库负责。`/api/auth/[...all]` 挂载官方 Next.js handler。

注册与登录表单在客户端调用 Better Auth 客户端。注册字段为姓名、邮箱、密码；登录字段为邮箱、密码。密码至少 8 位。错误统一转成中文，不向登录用户泄露邮箱是否存在。成功后跳转经过校验的站内 `next` 地址，默认首页。

## 购物车写入

`addToCartAction` 只接收商品 ID、数量和安全的返回路径。Action 从请求 Cookie/headers 获取 Better Auth Session，不接受客户端 userId。服务层重新查询商品状态和库存；商品不可售、库存不足或数量非法时返回中文错误。

同一用户同一商品依赖已有唯一索引 `(user_id, product_id)`。写入在事务中锁定/读取现有购物车项，新增或累加数量，最终数量不能超过当前库存。成功后刷新 `/cart`，按钮显示成功反馈。

未登录时 Action 返回 `UNAUTHORIZED`，客户端跳转 `/login?next=<当前详情页>`。`/cart` 页面本身也在服务端验证 Session，未登录则跳转登录。

## 错误与安全

- API 统一返回 `{ error: { code, message } }`。
- 数据库对象不直接传到客户端，只返回显式 DTO。
- 图片 URL 只允许项目配置的来源；无可靠来源时使用占位图，避免任意远程主机。
- `BETTER_AUTH_SECRET` 只从环境变量读取并在 `.env.example` 提供占位，不提交真实值。
- 认证和购物车异常日志不记录密码、Cookie、token 或数据库连接串。

## 验证

- 单元测试覆盖查询参数归一化、API 错误映射、认证表单校验、购物车鉴权/库存/累加规则。
- 数据库集成验证覆盖商品搜索、分类计数、详情关联和购物车真实写入。
- 完成后运行 `npm test`、`npm run lint`、`npm run typecheck`、`npm run build`，并在本地 MySQL 上验证注册、登录、加入购物车闭环。
