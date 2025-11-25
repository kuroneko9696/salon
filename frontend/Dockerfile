FROM node:20-alpine AS base

# 依存関係のインストール用
FROM base AS deps
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
RUN npm ci

# ビルド用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.jsのビルド
RUN npm run build

# 本番実行用
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# セキュリティのため非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルをコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud RunではPORT環境変数が自動設定される
ENV PORT=3000
EXPOSE 3000

# Next.jsをスタンドアロンモードで起動
CMD ["node", "server.js"]
