# 旧雨电商

旧雨电商是一个使用 Next.js 构建的微型电商项目，包含商品浏览、用户注册登录、心悦会员、购物车、订单、支付和后台管理。

## 当前状态

核心商城、后台管理、会员、评价、售后和支付流程已实现；默认使用模拟支付，也可通过配置切换微信支付 Native 扫码支付。

## 技术栈

- Next.js 16.3.5
- React 19.2.8
- TypeScript 5.9.3
- Tailwind CSS 4.3.3
- MySQL 8.4 LTS
- Drizzle ORM 0.45.2

## 数据库

复制环境变量示例：

```bash
cp .env.example .env
```

如果本机安装了 Docker，可以启动 MySQL 8.4：

```bash
docker compose up -d mysql
```

然后执行迁移和种子数据：

```bash
npm run db:migrate
npm run db:seed
```

数据库结构包含用户认证、心悦会员、分类、商品、购物车、订单、模拟支付和会员升级流水。

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看项目。

## AI 智能客服

在 `.env` 中设置 `DEEPSEEK_API_KEY`，按需设置 `DEEPSEEK_MODEL`（默认 `deepseek-flash`），重启开发服务器后即可通过页面右下角的“咨询客服”使用。生产部署时在 `.env.production` 中配置相同变量。密钥只在服务端使用，不要写进 `NEXT_PUBLIC_` 变量或提交到 Git。

客服可参考公开商品、分类、会员与购物规则回答问题；会话仅保存在当前浏览器页面内，刷新或点击“结束会话”即清空。客服不能查看个人订单、账户或支付状态，也不能代用户操作。未配置密钥时，聊天窗口会显示未启用提示。

## 找回密码邮件

本地测试可使用 QQ 邮箱 SMTP。在 QQ 邮箱网页设置中开启 SMTP 并生成授权码，然后在未纳入 Git 的 `.env` 中填写 `QQ_SMTP_USER`（完整 QQ 邮箱地址）和 `QQ_SMTP_AUTH_CODE`（授权码，不是 QQ 登录密码），重启项目。找回密码邮件只发送到已注册用户的邮箱，重置链接有效期为 1 小时；应用日志不会输出重置链接或令牌。生产环境使用 `.env.production` 配置相同变量，发送量增加后建议改用专用事务邮件服务。

## 微信支付 Native

生产环境复制 `.env.production.example` 为 `.env.production`，填入微信支付商户证书、私钥、API v3 密钥和公网 HTTPS 回调地址，并设置 `PAYMENT_PROVIDER=WECHAT_NATIVE`。支付页会生成 Native 二维码；回调地址为 `/api/payments/wechat/notify`，用户也可以在扫码后主动查询订单状态。

微信支付回调必须能够从公网访问，且必须使用 HTTPS。商户私钥、平台证书和 API v3 密钥只放在部署环境变量中，禁止提交到 Git。

## 生产部署

项目提供 `Dockerfile` 和 `compose.production.yaml`。首次部署：

```bash
cp .env.production.example .env.production
# 编辑 .env.production，替换数据库、Better Auth 和微信支付配置
docker compose --env-file .env.production -f compose.production.yaml build app
docker compose --env-file .env.production -f compose.production.yaml up -d mysql
docker compose --env-file .env.production -f compose.production.yaml --profile tools run --rm migrate
docker compose --env-file .env.production -f compose.production.yaml up -d app
```

生产镜像使用 Next.js standalone 输出；商品上传图片会由 Sharp 自动纠正方向、限制最长边并转换为 WebP，上传目录通过 Docker volume 持久化。健康检查地址为 `/api/health`。

## 检查命令

```bash
npm run lint
npm run build
```
