# 购物车完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 完成安全、可编辑的登录用户购物车，并加固公开商品模块错误与图片边界。

**Architecture:** 页面读取继续使用 Server Component；修改与删除使用重新鉴权的 Server Action；Cart service 表达业务结果，repository 在 MySQL 事务中校验所有权、商品、分类和库存。

**Tech Stack:** Next.js 16.3.5、React 19.2.8、TypeScript strict、Tailwind CSS 4、Drizzle ORM 0.45.2、MySQL、Zod 4.6.2。

**Spec:** docs/superpowers/specs/2026-09-13-cart-management-design.md

## Global Constraints

- 用户只能操作自己的购物车项。
- 商品和分类均 ACTIVE 才可新增或更新数量。
- 数量必须是 1–99 的整数且不超过实时库存。
- 金额全部使用整数分；UI 文案使用中文。
- use server 文件只导出异步函数和 TypeScript 类型。

---

### Task 1: 公开模块安全加固

- [ ] 为 API 500 和图片路径编写失败测试。
- [ ] 实现统一异常映射与安全站内图片路径解析。
- [ ] 运行定向测试确认通过。

### Task 2: 购物车领域服务

- [ ] 为更新、删除、所有权、库存和可结算合计编写失败测试。
- [ ] 扩展 CartRepository 契约与 CartService 结果映射。
- [ ] 运行服务测试确认通过。

### Task 3: MySQL 购物车仓储

- [ ] 编写隐藏分类和跨用户操作集成测试并确认失败。
- [ ] 在事务中实现分类可见性、数量覆盖与所有权删除。
- [ ] 运行 MySQL 集成测试确认通过并清理测试数据。

### Task 4: 购物车页面交互

- [ ] 新增每行数量更新与删除 Client Component。
- [ ] 新增两个 Server Action 并在内部重新获取 Session、校验 Zod 输入、刷新 /cart。
- [ ] 更新合计与去结算状态。

### Task 5: 完整验证

- [ ] 运行 test、lint、typecheck、build。
- [ ] 在浏览器完成登录、添加、修改数量与删除闭环。
- [ ] 检查 Git diff 与忽略文件，确认没有隐私内容。
