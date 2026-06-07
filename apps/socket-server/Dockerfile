# Build from monorepo root:
#   docker build -f apps/socket-server/Dockerfile -t studyverce-socket .
FROM node:25.8.1-alpine AS builder

RUN npm install -g pnpm@11.5.2

WORKDIR /app

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/socket-server/package.json apps/socket-server/
COPY packages/shared/package.json packages/shared/
COPY packages/rate-limit/package.json packages/rate-limit/
COPY packages/redis/package.json packages/redis/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY packages/rate-limit packages/rate-limit
COPY packages/redis packages/redis
COPY apps/socket-server apps/socket-server

RUN pnpm --filter @studyverce/socket-server build

FROM node:25.8.1-alpine AS runner

RUN apk add --no-cache wget
RUN npm install -g pnpm@11.5.2

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/socket-server/package.json apps/socket-server/
COPY packages/shared/package.json packages/shared/
COPY packages/rate-limit/package.json packages/rate-limit/
COPY packages/redis/package.json packages/redis/

COPY --from=builder /app/apps/socket-server/dist ./apps/socket-server/dist

# Production deps only (hoisted via .npmrc); workspace packages are bundled into dist.
RUN pnpm install --frozen-lockfile --prod --filter @studyverce/socket-server...

WORKDIR /app/apps/socket-server

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/health || exit 1

CMD ["node", "dist/index.js"]
