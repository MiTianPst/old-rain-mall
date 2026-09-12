# 旧雨电商

旧雨电商是一个使用 Next.js 构建的微型电商项目，计划包含商品浏览、用户注册登录、心悦会员、购物车、订单、模拟支付和后台管理。

## 当前状态

基础工程和 MySQL 数据层已创建，页面业务功能尚未开始实现。

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

## 检查命令

```bash
npm run lint
npm run build
```
