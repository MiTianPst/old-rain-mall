FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建阶段只使用占位配置，运行时由 compose 的环境文件覆盖。
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/old_rain_mall \
    BETTER_AUTH_SECRET=build_only_secret_replace_at_runtime_2026 \
    BETTER_AUTH_URL=http://localhost:3000 \
    ORDER_EXPIRATION_JOB_SECRET=build_only_job_secret_replace_at_runtime \
    PAYMENT_PROVIDER=MOCK
RUN npm run build

FROM deps AS migrator
WORKDIR /app
COPY . .
CMD ["npm", "run", "db:migrate"]

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p /app/public/uploads/products \
  && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
