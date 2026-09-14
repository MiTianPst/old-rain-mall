# 旧雨电商商品发现与用户互动设计

## 目标

在现有模块化单体架构内补齐高级筛选排序、商品收藏、浏览足迹、已购评价和同类推荐，让用户可以更快找到商品、保存购买意向、参考真实评价并继续发现相关商品。

## 范围

本阶段包含：

- 商品列表按价格区间、库存状态和排序规则筛选。
- 登录用户收藏或取消收藏商品，并在个人中心查看收藏。
- 登录用户打开商品详情后记录最近浏览，并在个人中心查看最近 30 件商品。
- 已购用户提交星级和文字评价，管理员审核后公开。
- 商品详情展示评价摘要、公开评价和确定性相关商品推荐。

本阶段不包含 Elasticsearch、Redis、消息队列、匿名数据跨设备同步、评价图片、商品问答、AI 个性化推荐、优惠券、真实支付和消息通知。

## 架构

沿用 Next.js 模块化单体。页面由 Server Component 读取服务层 DTO，用户交互通过 Server Action 写入，服务层负责鉴权结果映射和业务规则，Repository 负责 Drizzle/MySQL 查询。

新增三个业务边界：

- `engagement`：收藏和浏览足迹。
- `reviews`：评价资格、提交、公开查询和管理员审核。
- `catalog recommendations`：公开商品约束内的同类推荐。

Client Component 只负责按钮状态、表单反馈和详情页浏览记录触发，不直接访问数据库。

## 数据模型

### favorites

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| id | unsigned int | 自增主键 |
| user_id | varchar(36) | 外键 users，用户删除时级联 |
| product_id | unsigned int | 外键 products，商品删除时级联 |
| created_at | timestamp | 创建时间 |

建立 `favorites_user_product_unique(user_id, product_id)` 和 `favorites_user_created_idx(user_id, created_at)`。

### product_views

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| id | unsigned int | 自增主键 |
| user_id | varchar(36) | 外键 users，用户删除时级联 |
| product_id | unsigned int | 外键 products，商品删除时级联 |
| view_count | unsigned int | 默认 1 |
| last_viewed_at | timestamp | 最近浏览时间 |
| created_at | timestamp | 首次浏览时间 |

同一用户和商品只保留一行，重复浏览更新 `last_viewed_at` 并增加 `view_count`。建立 `product_views_user_product_unique` 和 `product_views_user_last_viewed_idx`。每次记录后删除该用户排序第 31 位之后的记录。

### product_reviews

评价状态为 `PENDING`、`APPROVED`、`REJECTED`。

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| id | unsigned int | 自增主键 |
| user_id | varchar(36) | 外键 users，限制删除 |
| product_id | unsigned int | 外键 products，限制删除 |
| order_item_id | unsigned int | 外键 order_items，限制删除 |
| rating | unsigned tinyint | 1 到 5 |
| content | varchar(1000) | 去除首尾空格后 5 到 1000 字 |
| status | enum | 默认 PENDING |
| review_note | varchar(500) | 管理员审核备注，可空 |
| reviewed_by | varchar(36) | 管理员用户，可空 |
| reviewed_at | timestamp | 审核时间，可空 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

建立 `product_reviews_user_product_unique`、`product_reviews_product_status_created_idx` 和 `product_reviews_status_created_idx`，并为评分增加 1 到 5 的检查约束。

## 商品查询契约

```ts
type CatalogSort = "newest" | "price_asc" | "price_desc" | "sales";

type CatalogQuery = {
  search: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  sort: CatalogSort;
  page: number;
};
```

URL 中 `minPrice` 和 `maxPrice` 使用人民币元的非负整数，解析后转换为整数分传给 Repository。最小价格不得大于最大价格，空值不进入 URL。

商品价格筛选和排序使用在售 SKU 的最低价格；库存筛选要求至少一个在售 SKU 的库存大于零。排序规则：

- `newest`：商品创建时间倒序、ID 倒序。
- `price_asc`：最低在售 SKU 价格升序、ID 倒序。
- `price_desc`：最低在售 SKU 价格倒序、ID 倒序。
- `sales`：成功支付且未取消、关闭或退款的销量倒序、创建时间倒序。

搜索、分类、价格、库存和排序参数在分页链接中全部保留。

## 收藏

收藏写操作要求有效登录会话和 ACTIVE 用户状态。只允许收藏分类与商品均为公开状态且存在在售 SKU 的商品。重复收藏返回当前已收藏状态；取消收藏只删除当前用户自己的记录。

```ts
type FavoriteCommandResult =
  | { ok: true; favorited: boolean; message: string }
  | { ok: false; code: "UNAUTHORIZED" | "USER_FROZEN" | "PRODUCT_UNAVAILABLE"; message: string };
```

商品卡和详情页接收服务端计算的 `isFavorited`。未登录用户点击收藏时返回登录地址，登录后返回原页面。`/account/favorites` 只展示仍可公开购买的收藏商品。

## 浏览足迹

详情页渲染后由轻量 Client Component 调用 Server Action。未登录用户静默跳过；冻结用户允许读取历史记录，但不新增足迹。

记录操作使用 upsert 更新当前商品，并在同一事务内保留最近 30 行。`/account/history` 按最近浏览时间倒序展示，并提供两段式确认的清空操作，不使用浏览器原生弹窗。

## 评价

提交评价必须满足：

- 用户已登录且状态为 ACTIVE。
- 商品存在于该用户的订单项中。
- 对应订单状态为 `DELIVERED` 或 `COMPLETED`。
- 对应订单支付状态为 `SUCCESS`。
- 订单未退款，用户尚未评价过该商品。
- 评分是 1 到 5 的整数，内容去除首尾空格后长度为 5 到 1000。

提交后状态为 PENDING，提示“评价已提交，审核通过后展示”。管理员只能审核 PENDING 评价；通过或拒绝都写入审核字段与 `audit_logs`。

公开商品详情只读取 APPROVED 评价，每页 10 条，显示脱敏用户名、评分、内容和日期。摘要返回平均分、评价总数和 1 到 5 星分布。公开 DTO 不返回用户 ID、邮箱、订单号和管理员备注。

订单详情在符合资格的订单项旁提供评价入口；商品详情在当前用户有资格时显示评价表单。

## 推荐

相关推荐最多 4 件，满足公开商品约束并排除当前商品。排序依次为：同分类优先、成功支付销量倒序、创建时间倒序、商品 ID 倒序。结果为空时不渲染推荐区域。

## 页面

- 首页：价格区间、仅看有货和排序控件。
- 商品卡：收藏按钮。
- 商品详情：收藏、足迹、评价摘要、评价列表、评价表单和相关推荐。
- 个人中心：收藏与足迹快捷入口。
- `/account/favorites`：收藏商品网格。
- `/account/history`：最近浏览与清空操作。
- `/admin/reviews`：按状态筛选并审核评价。

所有 UI 文案使用中文，样式沿用暖白、深咖和琥珀色视觉体系。

## 错误与安全

- Server Action 使用 Zod 校验 FormData，并从会话读取用户身份。
- 服务端重新查询用户状态、商品公开状态和评价资格。
- 普通用户只能管理自己的收藏、足迹和评价。
- 管理员审核在服务层重新鉴权，隐藏按钮不代替权限控制。
- 唯一索引处理并发重复写入，服务层转换为稳定中文结果。

## 测试与验收

- 单元测试覆盖查询解析、收藏状态、足迹裁剪、评价资格、审核权限和推荐上限。
- MySQL 集成测试覆盖唯一约束、连接查询、足迹裁剪和审核审计，默认测试命令中保持跳过。
- 基础验收运行 `npm test`、`npm run typecheck`、`npm run lint` 和 `npm run build`。
- 迁移只在本地 MySQL 可用且目标数据库已确认后执行。
