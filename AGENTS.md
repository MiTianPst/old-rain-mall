<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 代码注解规范

- 所有新增代码文件顶部必须添加文件级注解，说明文件用途、所属功能以及主要输入输出或关键行为。
- 每个函数、类、复杂常量和关键逻辑块前都必须添加中文注解。
- 注解应说明代码“做什么”和“为什么这样做”，不要机械翻译每一行语法。
- 修改已有代码时必须同步更新相关注解，不能保留过时说明。
- 用户明确要求逐行注解时，以用户当次要求为准。
